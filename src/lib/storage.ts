import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from 'firebase/storage';
import { getFirebaseStorage } from '@/lib/firebase';

export async function uploadBodyPhoto(
  uid: string,
  date: string,
  angle: 'front' | 'side' | 'back',
  file: File
): Promise<string> {
  const storage = getFirebaseStorage();
  const safeName = angle;
  const r = ref(storage, `users/${uid}/bodyPhotos/${date}/${safeName}`);
  await uploadBytes(r, file, { contentType: file.type || 'image/jpeg' });
  return getDownloadURL(r);
}

export async function deleteBodyPhotoFolder(uid: string, date: string): Promise<void> {
  const storage = getFirebaseStorage();
  const r = ref(storage, `users/${uid}/bodyPhotos/${date}`);
  try {
    const res = await listAll(r);
    await Promise.all(res.items.map((item) => deleteObject(item)));
  } catch {
    /* フォルダが空・未作成のときなど */
  }
}
