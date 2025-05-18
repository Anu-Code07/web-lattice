import CryptoJS from "crypto-js";
import { globalConfig } from "./config";

export function encryptData(data: any): string {
  if (
    !globalConfig.encryption?.enabled ||
    !globalConfig.encryption?.secretKey
  ) {
    return JSON.stringify(data);
  }

  const jsonString = JSON.stringify(data);
  return CryptoJS.AES.encrypt(
    jsonString,
    globalConfig.encryption.secretKey
  ).toString();
}

export function decryptData(encryptedData: string): string {
  if (
    !globalConfig.encryption?.enabled ||
    !globalConfig.encryption?.secretKey
  ) {
    return encryptedData;
  }

  const bytes = CryptoJS.AES.decrypt(
    encryptedData,
    globalConfig.encryption.secretKey
  );
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function generateEncryptionKeys() {
  const aesKey = CryptoJS.lib.WordArray.random(16).toString();
  const iv = CryptoJS.lib.WordArray.random(16).toString();
  return { aesKey, iv };
}
