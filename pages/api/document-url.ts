import type { NextApiRequest, NextApiResponse } from 'next';
import { getFileUrl } from '@/lib/cloudflare/r2-service-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid path parameter' });
  }
  try {
    const url = await getFileUrl(path);
    return res.status(200).json({ url });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate signed URL' });
  }
} 