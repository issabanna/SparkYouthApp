"""Verify a Spark preview APK, including updater identity and absence of QA trust overrides."""
import argparse,hashlib,json,os,pathlib,re,struct,subprocess,zipfile
parser=argparse.ArgumentParser();parser.add_argument('apk');args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[1]
config=json.loads((root/'apps/mobile/app.json').read_text())['expo']
sdk=pathlib.Path(os.environ.get('ANDROID_HOME','/workspace/android-sdk'))
tools=sdk/'build-tools/36.0.0';apk=pathlib.Path(args.apk)
badging=subprocess.check_output([str(tools/'aapt'),'dump','badging',str(apk)],text=True)
assert f"name='{config['android']['package']}'" in badging
assert f"versionCode='{config['android']['versionCode']}'" in badging
assert f"versionName='{config['version']}'" in badging
assert "sdkVersion:'24'" in badging and "targetSdkVersion:'36'" in badging
assert 'application-debuggable' not in badging
for permission in ['INTERNET','ACCESS_NETWORK_STATE']:
 assert 'android.permission.'+permission in badging
manifest=subprocess.check_output([str(tools/'aapt'),'dump','xmltree',str(apk),'AndroidManifest.xml'],text=True)
assert 'app.sparkyouth.mobile.MainApplication' in manifest
assert 'networkSecurityConfig' not in manifest, 'Production must not include the emulator trust override'
signature=subprocess.check_output([str(tools/'apksigner'),'verify','--print-certs',str(apk)],text=True)
cert=re.search(r'Signer #1 certificate SHA-256 digest: ([a-f0-9]+)',signature)[1]
previous=json.loads((root/'apps/admin/public/downloads/spark-youth-preview-0.1.7.json').read_text())
assert cert==previous['signingCertificateSha256'], 'Preview update signing key changed'
with zipfile.ZipFile(apk) as z:
 assert z.testzip() is None
 assert not any('test_proxy_ca' in n or 'test_network_security' in n for n in z.namelist())
 abis={n.split('/')[1] for n in z.namelist() if n.startswith('lib/') and n.endswith('.so')}
 assert abis=={'arm64-v8a','armeabi-v7a'},abis
 for abi in abis:
  assert any(n.startswith('lib/'+abi+'/libcronet.') for n in z.namelist())
 count=0
 for name in z.namelist():
  if not(name.startswith('lib/arm64-v8a/') and name.endswith('.so')):continue
  data=z.read(name);assert data[:5]==b'\x7fELF\x02'
  phoff=struct.unpack_from('<Q',data,32)[0]
  size,num=struct.unpack_from('<HH',data,54)
  for i in range(num):
   header=struct.unpack_from('<IIQQQQQQ',data,phoff+i*size)
   if header[0]==1:
    assert header[7]>=16384 and header[2]%16384==header[3]%16384,(name,'Not 16 KB page compatible')
  count+=1
 bundle=z.read('assets/index.android.bundle')
 for marker in [config['version'],'Cronet','E_RESET','spark-auth-session-v1']:
  assert marker.encode() in bundle or marker.encode('utf-16le') in bundle,marker
print(json.dumps({'version':config['version'],'bytes':apk.stat().st_size,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'signingCertificateSha256':cert,'architectures':sorted(abis),'arm64LibrariesVerifiedFor16KbPages':count,'qaTrustOverrides':False},indent=2))
