import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/config";

const uploadPDF = async (file: File) => {
  const storageRef = ref(storage, `pdfs/${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return url;
};

export default uploadPDF;
