import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Баннер А5 — Жылыой сазы",
};

export default function BannerPage() {
  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center p-4 print:p-0 print:bg-white print:min-h-0">
      {/* A5 Banner */}
      <div className="w-[148mm] h-[210mm] bg-[#FAF3E0] relative overflow-hidden shadow-2xl print:shadow-none shrink-0"
        style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.04] z-0"
          style={{
            backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 20px, #C9A84C 20px, #C9A84C 40px)"
          }}
        />

        {/* Gold frame border */}
        <div className="absolute inset-[2mm] border border-[#C9A84C]/30 rounded-sm z-20 pointer-events-none" />

        {/* Header band */}
        <div className="relative z-10 bg-gradient-to-br from-[#8B1A1A] to-[#6B1414] px-[5mm] py-[4mm] flex items-center gap-[3mm]">
          <Image
            src="/images/gallery/logo.jpeg"
            alt="Логотип"
            width={60}
            height={60}
            className="w-[16mm] h-[16mm] rounded-full object-cover border-[0.5mm] border-[#C9A84C] shrink-0"
          />
          <div>
            <div className="text-[7pt] text-[#C9A84C] uppercase tracking-wider font-medium">
              «Кең Жылыой» мәдениет үйі
            </div>
            <div className="text-[16pt] font-extrabold text-[#C9A84C] leading-tight mt-[0.5mm]">
              ЖЫЛЫОЙ САЗЫ
            </div>
            <div className="text-[8pt] text-[#FAF3E0]/80">
              фольклорлық ансамблі
            </div>
          </div>
        </div>

        {/* Group photo */}
        <div className="relative z-10 w-full h-[62mm] overflow-hidden">
          <Image
            src="/images/gallery/ensemble-photo.jpeg"
            alt="Жылыой сазы ансамблі"
            width={800}
            height={400}
            className="w-full h-full object-cover object-[center_20%]"
          />
          <div className="absolute bottom-0 left-0 right-0 h-[15mm] bg-gradient-to-t from-[#6B1414]/70 to-transparent" />
        </div>

        {/* Gold divider */}
        <div className="relative z-10 h-[1.5mm] bg-gradient-to-r from-[#8B1A1A] via-[#D4B85E] to-[#8B1A1A]" />

        {/* Content */}
        <div className="relative z-10 px-[5mm] py-[4mm] text-center">
          <h2 className="text-[11pt] text-[#8B1A1A] font-bold mb-[2mm] leading-tight">
            Қазақ халқының музыкалық мұрасын<br />сақтау мен насихаттау
          </h2>
          <p className="text-[7.5pt] text-[#4A3020] leading-[1.5] mb-[2mm]">
            Халық әндері мен күйлері, дәстүрлі аспаптық музыка,<br />
            авторлық туындылар және әлемдік классика
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-[6mm] my-[3mm]">
            <div className="text-center">
              <div className="text-[16pt] font-extrabold text-[#8B1A1A] leading-none">18</div>
              <div className="text-[6pt] text-[#8B1A1A]/60 mt-[0.5mm]">кәсіби өнерпаз</div>
            </div>
            <div className="text-center">
              <div className="text-[16pt] font-extrabold text-[#8B1A1A] leading-none">10+</div>
              <div className="text-[6pt] text-[#8B1A1A]/60 mt-[0.5mm]">репертуардағы шығарма</div>
            </div>
            <div className="text-center">
              <div className="text-[16pt] font-extrabold text-[#8B1A1A] leading-none">2026</div>
              <div className="text-[6pt] text-[#8B1A1A]/60 mt-[0.5mm]">құрылған жылы</div>
            </div>
          </div>
        </div>

        {/* QR section */}
        <div className="relative z-10 mx-[5mm] bg-gradient-to-br from-[#8B1A1A] to-[#6B1414] rounded-[3mm] p-[4mm] flex items-center gap-[4mm]">
          <div className="w-[28mm] h-[28mm] shrink-0 bg-[#FAF3E0] rounded-[2mm] p-[1.5mm]">
            <Image
              src="/qrcode.png"
              alt="QR код"
              width={200}
              height={200}
              className="w-full h-full"
            />
          </div>
          <div>
            <div className="text-[10pt] font-bold text-[#C9A84C] mb-[1mm]">
              QR-кодты сканерлеңіз!
            </div>
            <div className="text-[7pt] text-[#FAF3E0]/80 leading-[1.4]">
              Ансамбльдің толық портфолиосымен,<br />
              құрамымен және бейнежазбаларымен<br />
              танысыңыз
            </div>
            <div className="text-[6pt] text-[#C9A84C]/80 mt-[1.5mm] break-all">
              zhylyoi-sazy-production.up.railway.app
            </div>
          </div>
        </div>

        {/* Footer contacts */}
        <div className="relative z-10 px-[5mm] py-[3mm] flex justify-center gap-[5mm] flex-wrap">
          <div className="text-[6.5pt] text-[#8B1A1A] flex items-center gap-[1mm]">
            <svg className="w-[3mm] h-[3mm] fill-[#C9A84C] shrink-0" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            +7 778 927 63 87
          </div>
          <div className="text-[6.5pt] text-[#8B1A1A] flex items-center gap-[1mm]">
            <svg className="w-[3mm] h-[3mm] fill-[#C9A84C] shrink-0" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            dk.kenzhylyoi@gmail.com
          </div>
          <div className="text-[6.5pt] text-[#8B1A1A] flex items-center gap-[1mm]">
            <svg className="w-[3mm] h-[3mm] fill-[#C9A84C] shrink-0" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/></svg>
            Жылыой ауданы, Атырау облысы
          </div>
        </div>
      </div>
    </div>
  );
}
