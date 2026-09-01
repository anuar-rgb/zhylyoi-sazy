interface SectionTitleProps {
  title: string;
  subtitle?: string;
}

export default function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <div className="text-center mb-10 sm:mb-12">
      <h2 className="text-3xl sm:text-4xl font-bold text-forest mb-3">{title}</h2>
      <div className="w-24 h-1 bg-gold mx-auto rounded-full" />
      {subtitle && (
        <p className="mt-4 text-lg text-forest/70 max-w-2xl mx-auto">{subtitle}</p>
      )}
    </div>
  );
}
