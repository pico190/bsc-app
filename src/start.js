const { execSync } = require('child_process');
const path = require('path');

const autoDeploy = process.env.AUTO_DEPLOY !== 'false';

async function main() {
  if (autoDeploy) {
    console.log('🚀 Registrando comandos slash automáticamente...');
    try {
      execSync('node src/deploy.js', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      console.log('✅ Comandos registrados correctamente.');
    } catch (error) {
      console.error('❌ Error al registrar comandos. El bot no se iniciará.');
      console.error('   Puedes desactivar el deploy automático con AUTO_DEPLOY=false');
      process.exit(1);
    }
  } else {
    console.log('⏭️ Deploy automático desactivado. Saltando registro de comandos.');
  }

  console.log('🤖 Iniciando bot...');
  require('./index.js');
}

main();
