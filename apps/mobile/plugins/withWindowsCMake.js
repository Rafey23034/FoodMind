const { withProjectBuildGradle, withGradleProperties } = require('expo/config-plugins');

const marker = '// FoodMind: short native build paths on Windows';
const settings = `
${marker}
if (System.getProperty('os.name').toLowerCase().contains('windows')) {
  def ninjaExecutable = new File(rootProject.projectDir, '../tmp/tools/ninja/ninja.exe').canonicalFile
  if (!ninjaExecutable.exists()) {
    throw new GradleException('Run npm run android:setup in the FoodMind folder to prepare the Windows build tool.')
  }
  subprojects { nativeProject ->
    ['com.android.library', 'com.android.application'].each { pluginId ->
      nativeProject.plugins.withId(pluginId) {
        def androidConfig = nativeProject.extensions.getByName('android')
        androidConfig.externalNativeBuild.cmake.buildStagingDirectory =
          new File(rootProject.projectDir, "../tmp/cxx/\${nativeProject.name}").canonicalFile
        androidConfig.defaultConfig.externalNativeBuild.cmake.arguments.add('-DCMAKE_OBJECT_PATH_MAX=240')
        androidConfig.defaultConfig.externalNativeBuild.cmake.arguments.add("-DCMAKE_MAKE_PROGRAM=\${ninjaExecutable.absolutePath}".toString())
      }
    }
  }
}
`;

function addSettings(contents) {
  const previous = /\/\/ FoodMind: short native build paths on Windows[\s\S]*?^}\r?\n/m;
  const clean = contents.replace(previous, '');
  // Expo's root plugin eagerly evaluates native projects, so register this first.
  return clean.replace('apply plugin: "expo-root-project"', settings + '\napply plugin: "expo-root-project"');
}

module.exports = function withWindowsCMake(config) {
  config = withProjectBuildGradle(config, mod => {
    mod.modResults.contents = addSettings(mod.modResults.contents);
    return mod;
  });
  return withGradleProperties(config, mod => {
    if (!mod.modResults.some(item => item.key === 'org.gradle.workers.max')) {
      mod.modResults.push({ type: 'property', key: 'org.gradle.workers.max', value: '2' });
    }
    return mod;
  });
};
module.exports.addSettings = addSettings;
