const {withGradleProperties}=require('@expo/config-plugins');

module.exports=config=>withGradleProperties(config,config=>{
  const desired={
    'org.gradle.jvmargs':'-Xmx4096m -XX:MaxMetaspaceSize=1536m -XX:+HeapDumpOnOutOfMemoryError',
    'org.gradle.workers.max':'2',
    'kotlin.daemon.jvmargs':'-Xmx1536m',
    'reactNativeArchitectures':'arm64-v8a',
  };
  config.modResults=config.modResults.filter(item=>item.type!=='property'||!Object.hasOwn(desired,item.key));
  for(const [key,value]of Object.entries(desired))config.modResults.push({type:'property',key,value});
  return config;
});
