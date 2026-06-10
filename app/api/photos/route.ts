import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const p = path.join(process.cwd(), 'data', 'photos.json');
    if (!fs.existsSync(p)) return NextResponse.json({ projects: [] });
    return NextResponse.json(JSON.parse(fs.readFileSync(p, 'utf-8')));
  } catch { return NextResponse.json({ projects: [] }); }
}
