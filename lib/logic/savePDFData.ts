import { db } from "../firebase/config";
import { collection, addDoc, Timestamp } from "firebase/firestore";

const savePDFData = async ({ name, url, tags }: { name: string; url: string; tags: string[] }) => {
  await addDoc(collection(db, "pdfs"), {
    name,
    url,
    tags,
    createdAt: Timestamp.now(),
  });
};

export default savePDFData;
