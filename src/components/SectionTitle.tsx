interface SectionTitleProps {
  title: string;
  subtitle?: string;
}

export default function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <div className="text-center mb-8 sm:mb-12">
      <h2 className="text-2xl sm:text-4xl font-bold text-ocean mb-3">{title}</h2>
      <div className="w-24 h-1 bg-gold mx-auto rounded-full" />
      {subtitle && (
        <p className="mt-3 sm:mt-4 text-[15px] sm:text-lg text-ocean/70 max-w-2xl mx-auto">{subtitle}</p>
      )}
    </div>
  );
}
