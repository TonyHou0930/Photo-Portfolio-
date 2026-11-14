import fs from 'fs';
import path from 'path';
import { PortfolioData } from '@/lib/data';
import HomeClient from '@/components/HomeClient';

export default function Home() {
  const filePath = path.join(process.cwd(), 'data', 'photos.json');
  let data: PortfolioData = { projects: [] };
  try {
    if (fs.existsSync(filePath)) {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch {}
  return <HomeClient data={data} />;
}
