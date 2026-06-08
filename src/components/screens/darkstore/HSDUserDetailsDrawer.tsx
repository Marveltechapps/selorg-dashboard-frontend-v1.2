import React, { useCallback, useEffect, useState } from 'react';
import { Sheet, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { DarkstoreSheetContent } from '@/components/darkstore/DarkstoreSheetContent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User,
  Smartphone,
  MapPin,
  Clock,
  Hash,
  Copy,
  Check,
  Loader2,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import * as hsdApi from '@/api/hsd/hsdApi';

interface Props {
  user: hsdApi.HSDUserLoginRow | null;
  open: boolean;
  onClose: () => void;
}

function formatDateTime(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatExpiry(iso?: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const mins = Math.ceil(ms / 60000);
  return mins === 1 ? 'Expires in 1 min' : `Expires in ${mins} mins`;
}

export function HSDUserDetailsDrawer({ user, open, onClose }: Props) {
  const [otp, setOtp] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [pickerId, setPickerId] = useState<string | null>(null);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadActiveOtp = useCallback(async () => {
    if (!user?.userId) return;
    setLoadingOtp(true);
    try {
      const data = await hsdApi.getHsdUserDeviceOtp(user.userId, {
        phoneNumber: user.phoneNumber,
      });
      setOtp(data.otp || data.deviceRequestOtp || null);
      setExpiresAt(data.expiresAt || null);
      setPickerId(data.pickerId || null);
    } catch {
      setOtp(null);
      setExpiresAt(null);
    } finally {
      setLoadingOtp(false);
    }
  }, [user?.userId, user?.phoneNumber]);

  useEffect(() => {
    if (!open || !user) {
      setOtp(null);
      setExpiresAt(null);
      setPickerId(null);
      setCopied(false);
      return;
    }
    void loadActiveOtp();
    const interval = setInterval(() => {
      void loadActiveOtp();
    }, 10_000);
    return () => clearInterval(interval);
  }, [open, user, loadActiveOtp]);

  const handleGenerateOtp = async () => {
    if (!user?.userId) return;
    setGenerating(true);
    try {
      const data = await hsdApi.generateHsdUserDeviceOtp(user.userId, {
        phoneNumber: user.phoneNumber,
      });
      setOtp(data.otp || data.deviceRequestOtp || null);
      setExpiresAt(data.expiresAt || null);
      setPickerId(data.pickerId || null);
      toast.success(data.message || '6-digit OTP generated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate OTP');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyOtp = async () => {
    if (!otp) return;
    try {
      await navigator.clipboard.writeText(otp);
      setCopied(true);
      toast.success('OTP copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy OTP');
    }
  };

  const expiryLabel = formatExpiry(expiresAt);
  const isExpired = expiryLabel === 'Expired';

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <DarkstoreSheetContent className="p-0 flex flex-col h-full bg-white">
        <SheetTitle className="sr-only">HSD User Details</SheetTitle>
        <SheetDescription className="sr-only">
          User login session details and device approval OTP
        </SheetDescription>

        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-900">User Details</h3>
          <p className="text-xs text-slate-500 mt-1">
            HSD login session · generate 6-digit OTP for picker verification
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {!user ? (
              <div className="animate-pulse space-y-4">
                <div className="h-16 bg-slate-100 rounded" />
                <div className="h-32 bg-slate-100 rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 bg-sky-50 text-sky-700 rounded-full flex items-center justify-center border border-sky-200">
                    <User size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-900 truncate">
                      {user.userName || 'Unknown user'}
                    </h4>
                    <p className="text-sm text-slate-600 font-mono">{user.phoneNumber}</p>
                    <p className="text-xs text-slate-400 mt-1 truncate" title={user.userId}>
                      User ID: {user.userId}
                    </p>
                    {pickerId && (
                      <p className="text-xs text-slate-400 truncate" title={pickerId}>
                        Picker ID: {pickerId}
                      </p>
                    )}
                  </div>
                  <Badge
                    className={cn(
                      'shrink-0',
                      user.loginStatus === 'Active'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    )}
                  >
                    {user.loginStatus}
                  </Badge>
                </div>

                <Separator />

                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock size={14} className="shrink-0" />
                    <span>Logged in {formatDateTime(user.loginDateTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin size={14} className="shrink-0" />
                    <span>{user.darkStoreLocation}</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-600">
                    <Smartphone size={14} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-900">
                        {user.deviceInformation === 'Assigned' ? 'Device assigned' : 'No device assigned'}
                      </p>
                      {user.deviceId && (
                        <p className="text-xs font-mono mt-0.5">
                          {user.deviceId}
                          {user.deviceType ? ` · ${user.deviceType}` : ''}
                          {user.deviceSerial ? ` · SN ${user.deviceSerial}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Hash size={16} className="text-blue-600" />
                      <h4 className="font-bold text-slate-900">Device Approval OTP</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => void loadActiveOtp()}
                      disabled={loadingOtp}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                      title="Refresh OTP"
                    >
                      <RefreshCw size={14} className={loadingOtp ? 'animate-spin' : ''} />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Generate a 6-digit code for this picker. They enter it on the Collect Device
                    screen after tapping Request Approval OTP, then Verify.
                  </p>

                  {otp && !isExpired ? (
                    <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50 p-6 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-2">
                        Active OTP
                      </p>
                      <p className="text-4xl font-bold font-mono tracking-[0.25em] text-indigo-700 w-full">
                        {otp}
                      </p>
                      {expiryLabel && (
                        <p className="text-xs text-indigo-500 mt-3 font-medium">{expiryLabel}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleCopyOtp()}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Copied' : 'Copy OTP'}
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
                      <p className="text-sm text-slate-400">
                        {isExpired ? 'Previous OTP expired.' : 'No active OTP.'}
                      </p>
                      <p className="text-xs text-slate-300 mt-1">
                        Generate a new code or wait for the picker to request one.
                      </p>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={() => void handleGenerateOtp()}
                    disabled={generating}
                    className="w-full bg-blue-600 hover:bg-blue-700 whitespace-normal"
                  >
                    {generating ? (
                      <>
                        <Loader2 size={16} className="animate-spin mr-2" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Zap size={16} className="mr-2" />
                        Generate 6-Digit OTP
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DarkstoreSheetContent>
    </Sheet>
  );
}
