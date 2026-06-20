import QRCode from 'qrcode';
import sharp from 'sharp';

const QR_SIZE = 180;
const QR_MARGIN = 2;
const EDGE_OFFSET = 20;
const WHITE_PADDING = 8;
const INVITE_BASE_URL = 'https://admin.nivle-ekadi.com/invite';

export async function generateCardWithQR(
  cardImageUrl: string,
  invitationCode: string
): Promise<Buffer | null> {
  try {
    const inviteUrl = `${INVITE_BASE_URL}/${invitationCode}`;

    const cardResponse = await fetch(cardImageUrl);
    if (!cardResponse.ok) {
      return null;
    }
    const cardBuffer = Buffer.from(await cardResponse.arrayBuffer());

    const qrBuffer = await QRCode.toBuffer(inviteUrl, {
      type: 'png',
      width: QR_SIZE,
      margin: QR_MARGIN,
    });

    const paddedQrSize = QR_SIZE + WHITE_PADDING * 2;
    const qrWithBackground = await sharp({
      create: {
        width: paddedQrSize,
        height: paddedQrSize,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: qrBuffer, top: WHITE_PADDING, left: WHITE_PADDING }])
      .png()
      .toBuffer();

    const cardMeta = await sharp(cardBuffer).metadata();
    const cardWidth = cardMeta.width ?? 0;
    const cardHeight = cardMeta.height ?? 0;
    if (!cardWidth || !cardHeight) {
      return null;
    }

    const left = Math.max(0, cardWidth - paddedQrSize - EDGE_OFFSET);
    const top = Math.max(0, cardHeight - paddedQrSize - EDGE_OFFSET);

    return await sharp(cardBuffer)
      .composite([{ input: qrWithBackground, left, top }])
      .png()
      .toBuffer();
  } catch (error) {
    console.error('generateCardWithQR failed:', error);
    return null;
  }
}
