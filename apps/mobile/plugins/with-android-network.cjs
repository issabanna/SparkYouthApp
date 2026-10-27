const { withMainApplication } = require('expo/config-plugins');
const marker = '// Spark Android HTTPS compatibility';
function configureApplication(source) {
  if (source.includes(marker)) return source;
  const anchor = 'super.onCreate()';
  if (source.split(anchor).length !== 2) throw Error('Cannot locate Android application initialization');
  return source.replace(anchor, `${anchor}
    ${marker}
    // Use HTTP/1.1 to avoid HTTP/2 negotiation on the reported reset path.
    // Keep platform TLS trust/hostname validation and never replay failed writes.
    com.facebook.react.modules.network.OkHttpClientProvider.setOkHttpClientFactory(
      com.facebook.react.modules.network.OkHttpClientFactory {
        com.facebook.react.modules.network.OkHttpClientProvider.createClientBuilder(this)
          .protocols(listOf(okhttp3.Protocol.HTTP_1_1))
          .retryOnConnectionFailure(false)
          .connectTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
          .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
          .writeTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
          .build()
      }
    )`);
}
module.exports = config => withMainApplication(config, mod => {
  if (mod.modResults.language !== 'kt') throw Error('Spark networking requires the Kotlin Android application template');
  mod.modResults.contents = configureApplication(mod.modResults.contents);
  return mod;
});
module.exports.configureApplication = configureApplication;
