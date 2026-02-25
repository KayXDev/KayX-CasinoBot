import type { NextApiRequest } from 'next'
import { setupSocketIO, type NextApiResponseServerIO } from '../../lib/socket'

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' })
    return
  }

  // Configurar Socket.IO
  setupSocketIO(res)
  
  res.status(200).json({ message: 'Socket.IO initialized' })
}