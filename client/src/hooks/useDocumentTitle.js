import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | Wakis Mart` : 'Wakis Mart | African & Caribbean Deli and Grocery';
  }, [title]);
}
