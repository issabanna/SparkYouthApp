const { withMainApplication, withAppBuildGradle } = require('expo/config-plugins');
const marker = '// Spark native Cronet transport';
const implementation = `
private class SparkCronetTransport(context: android.content.Context) : okhttp3.Interceptor {
  private val appContext = context.applicationContext
  private val delegate by lazy(LazyThreadSafetyMode.SYNCHRONIZED) {
    val engine = org.chromium.net.CronetEngine.Builder(appContext)
      .setUserAgent("SparkYouth/" + BuildConfig.VERSION_NAME + " (Android)")
      .build()
    check(!engine.javaClass.name.contains("JavaCronetEngine")) { "Bundled native Cronet is unavailable" }
    com.google.net.cronet.okhttptransport.CronetInterceptor.newBuilder(engine)
      .setRedirectStrategy(com.google.net.cronet.okhttptransport.RedirectStrategy.withoutRedirects())
      .build()
  }
  override fun intercept(chain: okhttp3.Interceptor.Chain): okhttp3.Response {
    if (BuildConfig.DEBUG && chain.request().url.scheme == "http") return chain.proceed(chain.request())
    if (chain.request().url.scheme != "https") throw java.io.IOException("HTTPS is required")
    return try {
      delegate.intercept(chain)
    } catch (error: LinkageError) {
      throw java.io.IOException("Native transport could not load for this device", error)
    } catch (error: RuntimeException) {
      throw java.io.IOException("Native HTTPS transport failed", error)
    }
  }
}
`;
function configureApplication(source) {
  if (source.includes(marker)) {
    const start = source.indexOf('\nprivate class SparkCronetTransport');
    if (start < 0) throw Error('Cannot locate existing native transport implementation');
    return source.slice(0, start) + implementation;
  }
  // Upgrade the previous HTTP/1.1 experiment, including an existing native tree.
  source = source.replace(/    \/\/ Spark Android HTTPS compatibility[\s\S]*?(?=    DefaultNewArchitectureEntryPoint.releaseLevel)/, '');
  const anchor = 'super.onCreate()';
  if (source.split(anchor).length !== 2) throw Error('Cannot locate Android application initialization');
  return source.replace(anchor, `${anchor}
    ${marker}
    val transport = SparkCronetTransport(this)
    com.facebook.react.modules.network.OkHttpClientProvider.setOkHttpClientFactory(
      com.facebook.react.modules.network.OkHttpClientFactory {
        com.facebook.react.modules.network.OkHttpClientProvider.createClientBuilder(this)
          .retryOnConnectionFailure(false)
          .callTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
          .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
          .writeTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
          .addInterceptor(transport)
          .build()
      }
    )`) + implementation;
}
function configureGradle(source) {
  if (source.includes('com.google.net.cronet:cronet-okhttp:')) return source;
  const anchor = 'dependencies {';
  if (source.split(anchor).length !== 2) throw Error('Cannot locate Android app dependencies');
  return source.replace(anchor, `${anchor}
    // Pinned native transport; bundled provider works without Google Play Services (API 24+).
    implementation("com.google.net.cronet:cronet-okhttp:0.1.2")
    implementation("org.chromium.net:cronet-bundled:500.1.0")`);
}
module.exports = config => {
  config = withMainApplication(config, mod => {
    if (mod.modResults.language !== 'kt') throw Error('Spark networking requires a Kotlin application');
    mod.modResults.contents = configureApplication(mod.modResults.contents);
    return mod;
  });
  return withAppBuildGradle(config, mod => {
    mod.modResults.contents = configureGradle(mod.modResults.contents);
    return mod;
  });
};
module.exports.configureApplication = configureApplication;
module.exports.configureGradle = configureGradle;
