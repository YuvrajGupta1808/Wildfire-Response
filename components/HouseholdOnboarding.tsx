'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Save, Users } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { HouseholdInput } from '@/lib/types';

const splitList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export default function HouseholdOnboarding() {
  const { household, members, saveHousehold } = useAppStore();
  const [saving, setSaving] = useState(false);

  const defaults = useMemo<HouseholdInput>(
    () => ({
      name: household?.name ?? 'Rivera Household',
      homeAddress: household?.homeAddress ?? 'Fictional address near Santa Rosa, CA',
      region: household?.region ?? 'Sonoma County, California',
      supplies: household?.emergencyPreferences?.supplies ?? ['go bag', 'N95 masks', 'battery pack'],
      pets: household?.emergencyPreferences?.pets ?? ['Leo - dog'],
      vehicles: household?.emergencyPreferences?.vehicles ?? ['Blue SUV'],
      medicalDependencies: household?.emergencyPreferences?.medicalDependencies ?? ['portable oxygen battery'],
      accessibilityNotes: household?.emergencyPreferences?.accessibilityNotes ?? 'Wheelchair access needed.',
      outboundVoiceConsent: household?.outboundVoiceConsent ?? true,
      members:
        members.length > 0
          ? members.slice(0, 3).map((member) => ({
              name: member.name,
              role: member.role,
              location: member.location,
              needs: member.needs,
              contactMethod: member.contactMethod,
              phone: member.phone,
              voiceConsent: member.voiceConsent,
            }))
          : [
              {
                name: 'Sarah (Mom)',
                role: 'Parent',
                location: 'Work - Downtown Santa Rosa',
                needs: [],
                contactMethod: 'Vapi call + SMS',
                phone: '+15555550101',
                voiceConsent: true,
              },
              {
                name: 'Mark (Dad)',
                role: 'Parent',
                location: 'North Campus',
                needs: ['wheelchair access'],
                contactMethod: 'Vapi call',
                phone: '+15555550102',
                voiceConsent: true,
              },
            ],
    }),
    [household, members],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: HouseholdInput = {
      name: String(form.get('name') ?? ''),
      homeAddress: String(form.get('homeAddress') ?? ''),
      region: String(form.get('region') ?? ''),
      supplies: splitList(String(form.get('supplies') ?? '')),
      pets: splitList(String(form.get('pets') ?? '')),
      vehicles: splitList(String(form.get('vehicles') ?? '')),
      medicalDependencies: splitList(String(form.get('medicalDependencies') ?? '')),
      accessibilityNotes: String(form.get('accessibilityNotes') ?? ''),
      outboundVoiceConsent: form.get('outboundVoiceConsent') === 'on',
      members: [0, 1, 2].map((index) => ({
        name: String(form.get(`member_${index}_name`) ?? ''),
        role: String(form.get(`member_${index}_role`) ?? ''),
        location: String(form.get(`member_${index}_location`) ?? ''),
        needs: splitList(String(form.get(`member_${index}_needs`) ?? '')),
        contactMethod: String(form.get(`member_${index}_contact`) ?? ''),
        phone: String(form.get(`member_${index}_phone`) ?? ''),
        voiceConsent: form.get(`member_${index}_voice`) === 'on',
      })).filter((member) => member.name),
    };

    setSaving(true);
    await saveHousehold(input);
    setSaving(false);
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-500">
        <Users className="h-4 w-4" /> Household Profile
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <input name="name" defaultValue={defaults.name} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none" placeholder="Household name" />
        <input name="homeAddress" defaultValue={defaults.homeAddress} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none md:col-span-2" placeholder="Home address" />
        <input name="region" defaultValue={defaults.region} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none" placeholder="Region" />
        <input name="supplies" defaultValue={defaults.supplies.join(', ')} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none" placeholder="Supplies" />
        <input name="pets" defaultValue={defaults.pets.join(', ')} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none" placeholder="Pets" />
        <input name="vehicles" defaultValue={defaults.vehicles.join(', ')} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none" placeholder="Vehicles" />
        <input name="medicalDependencies" defaultValue={defaults.medicalDependencies.join(', ')} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none" placeholder="Medical dependencies" />
        <input name="accessibilityNotes" defaultValue={defaults.accessibilityNotes} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none" placeholder="Accessibility notes" />
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {[0, 1, 2].map((index) => {
          const member = defaults.members[index];
          return (
            <div key={index} className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
              <input name={`member_${index}_name`} defaultValue={member?.name} className="mb-2 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none" placeholder="Member name" />
              <input name={`member_${index}_role`} defaultValue={member?.role} className="mb-2 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none" placeholder="Role" />
              <input name={`member_${index}_location`} defaultValue={member?.location} className="mb-2 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none" placeholder="Location" />
              <input name={`member_${index}_needs`} defaultValue={member?.needs.join(', ')} className="mb-2 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none" placeholder="Needs" />
              <input name={`member_${index}_contact`} defaultValue={member?.contactMethod} className="mb-2 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none" placeholder="Contact method" />
              <input name={`member_${index}_phone`} defaultValue={member?.phone} className="mb-2 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-900 outline-none" placeholder="Phone" />
              <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-stone-500">
                <input name={`member_${index}_voice`} type="checkbox" defaultChecked={member?.voiceConsent} />
                Voice opt-in
              </label>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-stone-500">
          <input name="outboundVoiceConsent" type="checkbox" defaultChecked={defaults.outboundVoiceConsent} />
          Owner consents to approved outbound emergency calls
        </label>
        <button type="submit" className="flex items-center gap-2 rounded-xl bg-stone-950 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-stone-800" disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? 'Saving' : 'Save profile'}
        </button>
      </div>
    </form>
  );
}
