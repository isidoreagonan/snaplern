import { useEffect, useState } from "react";
import { signLearningImage } from "@/lib/learning-images";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & { src: string };

/** Renders an image stored in the private learning-images bucket via a signed URL. */
export function SignedImage({ src, ...rest }: Props) {
  const url = useSignedLearningUrl(src);
  if (!url) return <img {...rest} src="" alt={rest.alt ?? ""} />;
  return <img {...rest} src={url} alt={rest.alt ?? ""} />;
}

export function useSignedLearningUrl(src: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!src) {
      setUrl(null);
      return;
    }
    signLearningImage(src).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);
  return url;
}

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & { src: string };

export function SignedPdfLink({ src, children, ...rest }: LinkProps) {
  const url = useSignedLearningUrl(src);
  return (
    <a {...rest} href={url ?? "#"} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}