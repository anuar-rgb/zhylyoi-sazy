import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-darkred-dark text-cream/80 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-darkred font-bold">
                ЖС
              </div>
              <div>
                <div className="text-gold font-bold text-lg">Жылыой сазы</div>
                <div className="text-cream/50 text-xs">фольклорлық ансамбль</div>
              </div>
            </div>
            <p className="text-sm leading-relaxed">
              «Кең Жылыой» мәдениет үйі жанындағы фольклорлық ансамбль. Қазақ халқының музыкалық мұрасын сақтау мен насихаттау.
            </p>
          </div>

          <div>
            <h3 className="text-gold font-semibold mb-4">Навигация</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-gold transition-colors">Ансамбль туралы</Link></li>
              <li><Link href="/members" className="hover:text-gold transition-colors">Құрам</Link></li>
              <li><Link href="/repertoire" className="hover:text-gold transition-colors">Репертуар</Link></li>
              <li><Link href="/video" className="hover:text-gold transition-colors">Бейне</Link></li>
              <li><Link href="/plan" className="hover:text-gold transition-colors">Даму жоспары</Link></li>
              <li><Link href="/contacts" className="hover:text-gold transition-colors">Байланыс</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-gold font-semibold mb-4">Байланыс</h3>
            <ul className="space-y-2 text-sm">
              <li>Атырау облысы, Жылыой ауданы</li>
              <li>«Кең Жылыой» мәдениет үйі</li>
              <li>Тел: +7 778 927 63 87</li>
              <li>dk.kenzhylyoi@gmail.com</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-cream/10 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-cream/40">
          <span>&copy; {new Date().getFullYear()} «Жылыой сазы» фольклорлық ансамблі</span>
          <span>Жылыой ауданы, Атырау облысы</span>
        </div>
      </div>
    </footer>
  );
}
