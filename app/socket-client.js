import {io} from 'socket.io-client'

const url = `http://localhost:${process.env.PORT}`
const socket = io(url)

console.log(`[◎] Opening socket → ${url}`)


export default socket
