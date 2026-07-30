import { useState } from 'react';
import Input from '../components/Input';
import Button from '../components/Button';

const SettingsPage = () => {
  const [profile, setProfile] = useState({ name: 'Mina Patel', email: 'mina@support.ai', phone: '+1 415 555 0191' });

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-500">Profile</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Account settings</h2>
        <div className="mt-6 space-y-4">
          <Input label="Name" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />
          <Input label="Email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} />
          <Input label="Phone" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} />
          <Button>Save profile</Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Change password</h3>
          <div className="mt-4 space-y-4">
            <Input label="Current password" type="password" />
            <Input label="New password" type="password" />
            <Input label="Confirm password" type="password" />
            <Button variant="secondary">Update password</Button>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Notification settings</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"><span>Email alerts</span><input type="checkbox" defaultChecked /></label>
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"><span>Push notifications</span><input type="checkbox" defaultChecked /></label>
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"><span>SMS updates</span><input type="checkbox" /></label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
