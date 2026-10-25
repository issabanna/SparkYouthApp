import './style.css';
export const metadata = { title: 'Spark | لوحة الإدارة', description: 'إدارة مجتمع سبارك' };
export default function Layout({children}) { return <html lang="ar" dir="rtl"><head><link rel="stylesheet" href="/shared/forms.css" /></head><body>{children}</body></html>; }
