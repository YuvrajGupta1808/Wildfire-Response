import { NextRequest, NextResponse } from 'next/server';
import { getVapiPublicConfig } from '@/lib/services/vapi';

export async function GET(request: NextRequest) {
  return NextResponse.json(getVapiPublicConfig({ requestOrigin: request.nextUrl.origin }));
}
