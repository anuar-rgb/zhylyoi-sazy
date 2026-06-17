export default function BannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="print:block">
      <style>{`
        @media print {
          header, footer, nav { display: none !important; }
          main { padding: 0 !important; }
          body { background: white !important; min-height: auto !important; }
        }
      `}</style>
      {children}
    </div>
  );
}
