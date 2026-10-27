package app.sparkyouth.mobile;

import static org.junit.Assert.*;
import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.TimeUnit;
import okhttp3.*;
import org.chromium.net.CronetEngine;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class NetworkSmokeTest {
  private final String base = "https://sparkyouth.vercel.app";
  private OkHttpClient client() {
    Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
    OkHttpClient client = com.facebook.react.modules.network.OkHttpClientProvider.createClient(context);
    assertTrue(client.interceptors().stream().anyMatch(i -> i.getClass().getSimpleName().equals("SparkCronetTransport")));
    return client;
  }
  @Test public void nativeProviderSupportsThisAndroidVersion() {
    Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
    CronetEngine engine = new CronetEngine.Builder(context).build();
    assertFalse(engine.getClass().getName(), engine.getClass().getName().contains("JavaCronetEngine"));
    System.out.println("SPARK_NATIVE_ENGINE " + engine.getClass().getName() + " " + engine.getVersionString());
    engine.shutdown();
  }
  @Test public void authenticationStatusOverNativeHttps() throws Exception {
    try (Response response = client().newCall(new Request.Builder().url(base+"/api/auth").build()).execute()) {
      assertEquals(200, response.code());
      JSONObject json = new JSONObject(response.body().string());
      assertTrue(json.getBoolean("configured"));
      assertFalse(json.getBoolean("authenticated"));
    }
  }
  @Test public void loginBodyReachesApiAndReturnsValidationError() throws Exception {
    Request request = new Request.Builder().url(base+"/api/auth")
      .post(RequestBody.create(MediaType.get("application/json"), "{\"action\":\"login\",\"email\":\"\",\"password\":\"\",\"nativeProbe\":\"اختبار\"}"))
      .build();
    try (Response response = client().newCall(request).execute()) {
      assertEquals(400, response.code());
      assertTrue(new JSONObject(response.body().string()).has("error"));
    }
  }
  @Test public void unauthorizedAccountRemainsProtected() throws Exception {
    try (Response response = client().newCall(new Request.Builder().url(base+"/api/account")
        .header("Authorization", "Bearer invalid-native-test-token").build()).execute()) {
      assertEquals(401, response.code());
    }
  }
  @Test public void cancelledCallDoesNotSendRequest() throws Exception {
    Call call = client().newCall(new Request.Builder().url(base+"/api/auth").build());
    call.cancel();
    try { call.execute(); fail("Cancelled call must fail"); }
    catch (java.io.IOException expected) { assertTrue(call.isCanceled()); }
  }
}
