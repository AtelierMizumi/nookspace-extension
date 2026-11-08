import { getSupabaseClient } from '../../../infrastructure/supabase';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export class AvatarStorageService {
  /**
   * Validates avatar file before uploading
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'account.avatar.errorEmpty' };
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { valid: false, error: 'account.avatar.errorInvalidType' };
    }

    if (file.size > MAX_AVATAR_BYTES) {
      return { valid: false, error: 'account.avatar.errorTooLarge' };
    }

    return { valid: true };
  }

  /**
   * Uploads an avatar image for a user to Supabase Storage
   * Returns the public URL of the uploaded image
   */
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('AUTH_UNCONFIGURED');
    }

    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const ext = file.name.split('.').pop() || 'png';
    const filePath = `${userId}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await client.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = client.storage.from('avatars').getPublicUrl(filePath);
    if (!data?.publicUrl) {
      throw new Error('account.avatar.errorGetUrl');
    }

    return data.publicUrl;
  }
}

export const avatarStorageService = new AvatarStorageService();
