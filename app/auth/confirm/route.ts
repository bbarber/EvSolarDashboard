import { createClient } from '@/lib/supabase/server';
import { safeRedirectPath } from '@/lib/utilities/url-utility';
import { type EmailOtpType } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';

// The email OTP types Supabase accepts. Validate against this allow-list rather
// than blindly casting the query param to `EmailOtpType`.
const VALID_OTP_TYPES: readonly EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
];

function parseOtpType(value: string | null): EmailOtpType | null {
  return value && (VALID_OTP_TYPES as string[]).includes(value)
    ? (value as EmailOtpType)
    : null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = parseOtpType(searchParams.get('type'));
  // Validate the redirect target: an unchecked `next` is an open-redirect hole.
  const next = safeRedirectPath(searchParams.get('next'));

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      // redirect user to specified (validated) redirect URL or root of app
      redirect(next);
    } else {
      // redirect the user to an error page with some instructions
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  // redirect the user to an error page with some instructions
  redirect(`/auth/error?error=${encodeURIComponent('No token hash or type')}`);
}
