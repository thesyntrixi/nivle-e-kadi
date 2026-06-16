import QRCode from 'qrcode';

export async function generateGuestQrPng(invitationCode: string): Promise<Buffer> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nivle-app-v3.vercel.app';
  const inviteUrl = `${baseUrl}/invite/${invitationCode}`;

  return QRCode.toBuffer(inviteUrl, {
    type: 'png',
    width: 400,
    margin: 2,
  });
}

export function getPublicGuestQrUrl(invitationCode: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nivle-app-v3.vercel.app';
  return `${baseUrl}/api/public/qr/${encodeURIComponent(invitationCode)}`;
}
