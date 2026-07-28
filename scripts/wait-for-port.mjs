import net from "node:net"

const [, , host = "127.0.0.1", portArg = "20128", timeoutArg = "60000"] = process.argv
const port = Number(portArg)
const timeoutMs = Number(timeoutArg)
const startedAt = Date.now()

if (!Number.isInteger(port) || port <= 0) {
  console.error(`Invalid port: ${portArg}`)
  process.exit(1)
}

function canConnect() {
  return new Promise(resolve => {
    const socket = net.createConnection({ host, port })

    socket.once("connect", () => {
      socket.end()
      resolve(true)
    })

    socket.once("error", () => {
      socket.destroy()
      resolve(false)
    })

    socket.setTimeout(1000, () => {
      socket.destroy()
      resolve(false)
    })
  })
}

while (Date.now() - startedAt < timeoutMs) {
  if (await canConnect()) {
    console.log(`${host}:${port} is ready.`)
    process.exit(0)
  }

  await new Promise(resolve => setTimeout(resolve, 1000))
}

console.error(`Timed out waiting for ${host}:${port} after ${timeoutMs}ms.`)
process.exit(1)
