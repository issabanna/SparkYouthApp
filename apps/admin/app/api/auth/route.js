import auth from '../../../lib/user-auth.cjs';
import signup from '../../../lib/signup-policy.cjs';
import service from '../../../lib/content-service.cjs';
import { reply } from '../../../lib/registration-service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function authError(error) {
  const code = error?.code;
  if (code === 'invalid_credentials') return 'البريد الإلكتروني أو كلمة السر غير صحيحة.';
  if (code === 'email_not_confirmed') return 'يرجى تأكيد بريدك الإلكتروني من الرسالة المرسلة إليك، ثم تسجيل الدخول.';
  if (['user_already_exists','email_exists'].includes(code)) return 'تعذّر إنشاء الحساب. جرّب تسجيل الدخول أو استخدم بريدًا آخر.';
  if (['over_email_send_rate_limit', 'over_request_rate_limit'].includes(code)) return 'طلبات كثيرة. انتظر قليلًا ثم حاول مجددًا.';
  if (code === 'signup_disabled') return 'إنشاء الحسابات غير مفعّل حاليًا. تواصل مع الإدارة.';
  if (code === 'weak_password') return 'اختر كلمة سر أقوى من 8 أحرف على الأقل.';
  return 'تعذّر إتمام العملية. تحقق من البيانات أو حاول لاحقًا.';
}
export async function GET(request) {
  if (!auth.configured()) return reply({
    configured: false,
    authenticated: false
  }, 503);
  const user = await auth.userForRequest(request);
  return reply({
    configured: true,
    autoConfirmEmail: true,
    authenticated: !!user,
    user: user ? {
      id: user.id,
      email: user.email
    } : null
  }, auth.bearer(request) && !user ? 401 : 200);
}
export async function POST(request) {
  if (!service.sameOrigin(request)) return reply({
    error: 'طلب غير مسموح.'
  }, 403);
  if (!auth.configured()) return reply({
    error: 'خدمة الحسابات غير متاحة حاليًا.'
  }, 503);
  try {
    const text = await request.text();
    if (text.length > 6000) return reply({
      error: 'طلب غير صالح.'
    }, 413);
    const body = JSON.parse(text),
      client = auth.client();
    let result;
    if (['signup', 'login'].includes(body.action)) {
      const email = typeof body.email === 'string' ? body.email.trim() : '',
        password = body.password;
      if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || typeof password !== 'string' || !password || password.length > 128) return reply({
        error: 'أدخل بريدًا إلكترونيًا وكلمة سر صحيحة.'
      }, 400);
      if (body.action === 'signup') {
        if (password.length < 8) return reply({
          error: 'كلمة السر يجب أن تكون 8 أحرف على الأقل.'
        }, 400);
        if(!signup.allowSignup(request,email))return reply({error:'طلبات كثيرة. انتظر قليلًا ثم حاول مجددًا.'},429);
        if(!await signup.emailSignupEnabled())return reply({error:'إنشاء الحسابات غير مفعّل حاليًا. تواصل مع الإدارة.'},400);
        const created=await client.auth.admin.createUser({email,password,email_confirm:true});
        if(created.error)return reply({error:authError(created.error)},400);
        result=await client.auth.signInWithPassword({email,password});
      } else result = await client.auth.signInWithPassword({
        email,
        password
      });
    } else if (body.action === 'refresh') {
      if (typeof body.refreshToken !== 'string' || body.refreshToken.length > 2000) return reply({
        error: 'انتهت الجلسة. سجّل الدخول مجددًا.'
      }, 401);
      result = await client.auth.refreshSession({
        refresh_token: body.refreshToken
      });
    } else if (body.action === 'logout') {
      const user = await auth.userForRequest(request);
      if (!user) return reply({
        ok: true
      });
      const {
        error
      } = await client.auth.admin.signOut(auth.bearer(request), 'local');
      if (error) return reply({
        error: 'تعذّر إنهاء الجلسة. حاول مجددًا.'
      }, 503);
      return reply({
        ok: true
      });
    } else if (body.action === 'password') {
      const user = await auth.userForRequest(request);
      if (!user) return reply({
        error: 'تسجيل الدخول مطلوب.'
      }, 401);
      if (typeof body.oldPassword !== 'string' || body.oldPassword.length > 128 || typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128) return reply({
        error: 'أدخل كلمة السر الحالية وكلمة جديدة من 8 أحرف على الأقل.'
      }, 400);
      const verified = await client.auth.signInWithPassword({
        email: user.email,
        password: body.oldPassword
      });
      if (verified.error) return reply({
        error: 'كلمة السر الحالية غير صحيحة.'
      }, 400);
      const {
        data,
        error
      } = await client.auth.updateUser({
        password: body.password
      });
      if (error) return reply({
        error: authError(error)
      }, 400);
      return reply({
        session: auth.publicSession({
          ...verified.data.session,
          user: data.user
        })
      });
    } else return reply({
      error: 'إجراء غير صالح.'
    }, 400);
    if (result.error) return reply({
      error: authError(result.error)
    }, body.action === 'refresh' ? 401 : 400);
    return reply({
      session: auth.publicSession(result.data.session),
      confirmationRequired: !result.data.session
    });
  } catch {
    return reply({
      error: 'تعذّر الاتصال بخدمة الحسابات. حاول لاحقًا.'
    }, 503);
  }
}
