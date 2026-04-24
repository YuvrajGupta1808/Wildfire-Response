import { NextRequest, NextResponse } from 'next/server';
import { approveAction, findApproval, getDashboardData, rejectAction } from '@/lib/runtime-store';
import { createOutboundPhoneCall, isVapiServerConfigured } from '@/lib/services/vapi';
import { persistDashboardToInsForge } from '@/lib/services/insforge-persist';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { id?: string; decision?: 'approve' | 'reject' };
  if (!body.id) {
    return NextResponse.json({ error: 'Missing approval id' }, { status: 400 });
  }

  if (body.decision === 'reject') {
    const data = rejectAction(body.id);
    await persistDashboardToInsForge(data);
    return NextResponse.json(data);
  }

  const pending = findApproval(body.id);
  if (pending?.actionType === 'place_outbound_voice_call' && isVapiServerConfigured()) {
    const memberId = pending.preparedPayload.memberId as string | undefined;
    const preparedPhone = pending.preparedPayload.phone as string | undefined;
    const member = memberId ? getDashboardData().members.find((m) => m.id === memberId) : undefined;
    const phone = member?.phone ?? preparedPhone;
    if (phone) {
      const placed = await createOutboundPhoneCall({
        customerNumber: phone,
        customerName: member?.name,
      });
      if (placed.ok) {
        const data = approveAction(body.id, { source: 'vapi', vapiCallId: placed.vapiCallId });
        await persistDashboardToInsForge(data);
        return NextResponse.json(data);
      }
    }
  }

  const data = approveAction(body.id);
  await persistDashboardToInsForge(data);
  return NextResponse.json(data);
}
