function showHelp(commands) {
  console.log("Команды проекта:")
  Object.entries(commands).forEach(([name, command]) => {
    console.log(`  ${name.padEnd(12)} ${command.description}`)
  })
  console.log("")
  console.log("Примеры:")
  console.log("  npm run project -- install")
  console.log("  npm run project -- dev")
  console.log("  npm run project -- dev service users")
  console.log("  npm run project -- dev gateway public")
  console.log("  npm run project -- migrate")
  console.log("  npm run project -- migrate dist")
  console.log("  npm run project -- localhost root password")
  console.log("  npm run project -- localhost noNginx root password")
  console.log("  npm run project -- build frontend")
  console.log("  npm run project -- workspace service:users start")
}

module.exports = {
  showHelp
}
