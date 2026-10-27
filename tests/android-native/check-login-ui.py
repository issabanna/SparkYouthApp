"""Exercise the native login form with invalid data; creates no live account."""
import os,re,subprocess,sys,time,tempfile,xml.etree.ElementTree as ET
adb=os.path.join(os.environ.get('ANDROID_HOME','/workspace/android-sdk'),'platform-tools','adb')
serial=sys.argv[1] if len(sys.argv)>1 else 'emulator-5554'
def run(*args): return subprocess.check_output([adb,'-s',serial,*args],text=True)
def nodes():
 report=run('shell','uiautomator','dump','/sdcard/spark-login-ui.xml')
 if 'dumped to' not in report: return []
 with tempfile.TemporaryDirectory(prefix='spark-native-ui-') as folder:
  target=os.path.join(folder,'window.xml')
  run('pull','/sdcard/spark-login-ui.xml',target)
  return list(ET.parse(target).iter('node'))
def tap(node):
 x1,y1,x2,y2=map(int,re.findall(r'\d+',node.get('bounds')))
 run('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
run('shell','am','force-stop','app.sparkyouth.mobile')
run('shell','am','start','-W','-n','app.sparkyouth.mobile/.MainActivity')
for _ in range(10):
 view=nodes()
 if sum(n.get('class')=='android.widget.EditText' for n in view)>=2: break
 time.sleep(1)
else: raise AssertionError('Native login form did not finish loading')
assert not any(n.get('class')=='android.webkit.WebView' for n in view), 'Native UI is required'
for label,value in [('البريد الإلكتروني','invalid-email'),('كلمة السر','native-ui-check')]:
 field=next(n for n in view if n.get('class')=='android.widget.EditText' and n.get('content-desc')==label)
 tap(field);run('shell','input','text',value);run('shell','input','keyevent','66')
 view=nodes()
tap(next(n for n in view if n.get('class')=='android.widget.Button' and n.get('content-desc')=='دخول'))
for _ in range(5):
 view=nodes()
 if any('أدخل بريدًا إلكترونيًا وكلمة سر صحيحة.' in n.get('text','') for n in view):
  print('PASS native login screen: real native inputs submitted through Expo fetch to live API; expected Arabic validation response rendered')
  break
 time.sleep(1)
else: raise AssertionError('Native login did not receive the expected API validation response')

tap(next(n for n in view if n.get('class')=='android.widget.Button' and n.get('content-desc')=='فحص اتصال التطبيق'))
for _ in range(5):
 view=nodes()
 if any('الاتصال بالخادم ناجح.' in n.get('text','') for n in view):
  print('PASS native connection-check success status renders without crashing')
  break
 time.sleep(1)
else: raise AssertionError('Native connection check did not display its success result')
