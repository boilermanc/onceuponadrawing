
import React from 'react';
import Button from './ui/Button';

export type InfoPageType = 'about' | 'contact' | 'terms' | 'privacy';

interface InfoPagesProps {
  type: InfoPageType;
  onClose: () => void;
}

const InfoPages: React.FC<InfoPagesProps> = ({ type, onClose }) => {
  const renderContent = () => {
    switch (type) {
      case 'about':
        return (
          <div className="space-y-24 max-w-4xl mx-auto text-left pb-20">
            {/* Artistic Header */}
            <div className="text-center relative py-12">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-soft-gold/20 blur-[80px] rounded-full pointer-events-none -z-10"></div>
              <span className="inline-block text-8xl mb-4 animate-bounce duration-[4000ms]">👨‍🎨</span>
              <h2 className="text-6xl md:text-7xl font-black text-gunmetal tracking-tighter leading-none">
                The <span className="text-pacific-cyan">Studio</span> <br/> 
                <span className="italic font-serif">Manifesto</span>
              </h2>
              <div className="flex items-center justify-center gap-4 mt-6">
                <div className="h-px w-12 bg-silver"></div>
                <p className="text-blue-slate font-black uppercase tracking-[0.4em] text-xs">A Sweetwater Technologies Project</p>
                <div className="h-px w-12 bg-silver"></div>
              </div>
            </div>

            {/* Section 1: The Spark */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div className="space-y-6 animate-in slide-in-from-left-8 duration-700">
                <div className="inline-block px-4 py-1 bg-soft-gold/10 text-soft-gold rounded-full text-[10px] font-black uppercase tracking-widest border border-soft-gold/20">
                  Our Mission
                </div>
                <h3 className="text-3xl font-black text-gunmetal leading-tight">
                  Because every scribble is a masterpiece waiting to happen.
                </h3>
                <p className="text-lg text-blue-slate leading-relaxed font-medium italic font-serif">
                  "We noticed a tragedy: the world's most vivid art was being buried in basement boxes. We decided to build a bridge between the crayon and the cinema."
                </p>
                <p className="text-blue-slate leading-relaxed font-medium">
                  We are a collective of engineers and artists dedicated to one thing: preserving the uninhibited magic of childhood creativity using the latest in generative alchemy.
                </p>
              </div>
              <div className="relative group animate-in zoom-in-90 duration-700">
                <div className="absolute -inset-4 bg-pacific-cyan/10 rounded-[4rem] blur-2xl group-hover:blur-3xl transition-all"></div>
                <div className="relative bg-white p-4 rounded-[3.5rem] shadow-2xl border-4 border-silver/30 -rotate-2 group-hover:rotate-0 transition-transform duration-500 overflow-hidden">
                   <img src="https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?auto=format&fit=crop&q=80&w=600" className="w-full h-80 object-cover rounded-[3rem]" alt="Art studio" />
                   <div className="absolute bottom-8 left-8 right-8 p-4 bg-white/90 backdrop-blur-md rounded-2xl text-xs font-bold text-gunmetal border border-silver/50 text-center uppercase tracking-widest">
                     Studio #01
                   </div>
                </div>
              </div>
            </div>

            {/* Section 2: The Magic Pillars */}
            <div className="bg-gunmetal rounded-[4rem] p-12 md:p-20 text-white relative overflow-hidden shadow-3xl">
               <div className="absolute top-0 right-0 p-12 opacity-10 text-[12rem] rotate-12 pointer-events-none font-serif italic">Art</div>
               <h3 className="text-4xl font-black mb-12 text-center md:text-left">Our Creative <br/><span className="text-pacific-cyan">Foundations</span></h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  {[
                    { icon: '🎨', title: 'Authenticity', desc: 'We never overwrite the artist. We enhance, amplify, and animate while keeping the original heart beating.' },
                    { icon: '📽️', title: 'Cinematic Soul', desc: 'Using Veo technology, we choreograph movements that reflect the personality of the character.' },
                    { icon: '💎', title: 'Archival Quality', desc: 'Every book is printed on acid-free, premium matte paper designed to last for generations.' }
                  ].map((item, i) => (
                    <div key={i} className="space-y-4 group">
                      <div className="text-5xl group-hover:scale-125 transition-transform origin-left">{item.icon}</div>
                      <h4 className="text-xl font-black text-soft-gold uppercase tracking-widest">{item.title}</h4>
                      <p className="text-sm opacity-70 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
               </div>
            </div>

            {/* Mission Footer */}
            <div className="text-center py-12 px-8 border-4 border-dashed border-silver/30 rounded-[4rem] relative">
               <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-off-white px-6 text-xl">✨</div>
               <p className="text-3xl font-black text-gunmetal leading-tight mb-4">
                 Our mission isn't just to make books. <br/>
                 <span className="text-pacific-cyan">It's to make childhood immortal.</span>
               </p>
               <p className="text-xs font-black uppercase tracking-[0.5em] text-silver">Est. 2024</p>
            </div>
          </div>
        );
      case 'contact':
        return (
          <div className="max-w-4xl mx-auto text-center space-y-16 pb-20">
            <div className="relative inline-block mt-8">
               <span className="text-9xl drop-shadow-2xl animate-pulse">📬</span>
               <div className="absolute -top-4 -right-4 bg-pacific-cyan text-white text-xs font-black px-4 py-2 rounded-full rotate-12">New Mail!</div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-5xl md:text-7xl font-black text-gunmetal tracking-tighter">Artistic <br/>Correspondence</h2>
              <p className="text-blue-slate font-bold uppercase tracking-[0.3em]">The pigeon is ready for your message</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
               {[
                 { 
                   tag: 'General', 
                   title: 'The Studio Team', 
                   icon: '👋', 
                   link: 'team@onceuponadrawing.com', 
                   color: 'border-silver',
                   hover: 'hover:border-pacific-cyan'
                 },
                 { 
                   tag: 'Urgent', 
                   title: 'Magic Support', 
                   icon: '🔥', 
                   link: 'team@onceuponadrawing.com', 
                   color: 'border-soft-gold',
                   hover: 'hover:bg-soft-gold/5'
                 }
               ].map((card, i) => (
                 <div key={i} className={`group p-10 bg-white border-4 ${card.color} ${card.hover} rounded-[3rem] shadow-xl transition-all flex flex-col items-center animate-in fade-in slide-in-from-bottom-${4*(i+1)} duration-500`}>
                    <div className="text-xs font-black uppercase tracking-widest text-silver mb-6">{card.tag}</div>
                    <div className="text-5xl mb-4 group-hover:rotate-12 transition-transform">{card.icon}</div>
                    <h4 className="font-black text-gunmetal mb-2 text-xl">{card.title}</h4>
                    <a href={`mailto:${card.link}`} className="text-xs font-black text-blue-slate break-all hover:text-pacific-cyan transition-colors">{card.link}</a>
                 </div>
               ))}
            </div>

            <div className="bg-white/50 backdrop-blur-sm p-12 rounded-[4rem] border-2 border-dashed border-silver text-center">
               <h4 className="text-2xl font-black text-gunmetal mb-2">Digital HQ</h4>
               <p className="text-blue-slate font-medium"> We are a globally distributed studio of dreamers.</p>
               <div className="flex gap-4 mt-8 justify-center">
                  {['📸', '🐦', '📘', '🎨'].map(emoji => (
                    <div key={emoji} className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-lg cursor-pointer hover:-translate-y-2 transition-transform border border-silver/20">{emoji}</div>
                  ))}
               </div>
            </div>
          </div>
        );
      case 'terms':
      case 'privacy':
        const isPrivacy = type === 'privacy';
        return (
          <div className="max-w-5xl mx-auto space-y-16 text-left pb-20 animate-in fade-in duration-700">
            {/* Legal Header */}
            <div className="text-center space-y-4">
               <div className="relative inline-block">
                 <span className="text-8xl drop-shadow-xl">{isPrivacy ? '🛡️' : '📜'}</span>
                 <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-soft-gold rounded-full border-4 border-white flex items-center justify-center text-[10px] font-black">TM</div>
               </div>
               <h2 className="text-5xl md:text-7xl font-black text-gunmetal tracking-tighter">
                 {isPrivacy ? "The Guardian's Pledge" : "The Artisan's Accord"}
               </h2>
               <p className="text-blue-slate font-bold uppercase tracking-[0.4em]">Official Legal Protocol v2.1</p>
            </div>

            {/* The "Human" Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="p-12 bg-pacific-cyan text-white rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 text-6xl group-hover:rotate-45 transition-transform">⚖️</div>
                  <h4 className="font-black uppercase text-[10px] tracking-[0.4em] mb-6 opacity-70">The Plain Language Summary</h4>
                  <p className="text-2xl font-black leading-tight">
                    {isPrivacy 
                      ? "Your family's art is sacred. We don't sell it, we don't 'train' other people's AI with it, and we treat your child's data with the same care as our own children's." 
                      : "You keep ownership of the original art. We give you a magical version of it. Don't be a mean artist, and we'll keep the Studio lights on for you."}
                  </p>
               </div>
               <div className="p-12 bg-white border-4 border-silver rounded-[3.5rem] flex flex-col justify-center shadow-xl">
                  <h4 className="font-black text-blue-slate uppercase text-[10px] tracking-[0.4em] mb-6">Core Legal Pillars</h4>
                  <div className="space-y-4">
                    {[
                      { icon: '💎', text: "Zero Third-Party Data Selling" },
                      { icon: '🔒', text: "High-Grade Encryption Layers" },
                      { icon: '🎨', text: "Artist Sovereignty Guarantee" },
                      { icon: '📜', text: "Transparent AI Governance" }
                    ].map((p, i) => (
                      <div key={i} className="flex items-center gap-4 text-sm font-black text-gunmetal group">
                        <span className="w-10 h-10 bg-off-white rounded-xl flex items-center justify-center border-2 border-silver/30 group-hover:border-pacific-cyan transition-colors">{p.icon}</span> 
                        {p.text}
                      </div>
                    ))}
                  </div>
               </div>
            </div>

            {/* The Detailed Document */}
            <div className="bg-white p-12 md:p-20 rounded-[4rem] border-4 border-silver shadow-inner space-y-16 relative">
               <div className="absolute top-12 right-12 opacity-[0.03] text-[12rem] font-black pointer-events-none select-none">
                 {isPrivacy ? "PRIVACY" : "TERMS"}
               </div>
               
               <div className="prose prose-slate max-w-none">
                {isPrivacy ? (
                  <div className="space-y-12">
                    <section className="space-y-4">
                      <h3 className="text-2xl font-black text-gunmetal uppercase tracking-tight flex items-center gap-3">
                        <span className="text-pacific-cyan">01.</span> Data Sovereignty & Collection
                      </h3>
                      <p className="text-blue-slate font-medium leading-relaxed">
                        Sweetwater Technologies ("The Studio") acts as a processor for your family's creative data. We collect images specifically for transformation. When you upload a drawing, it is stored in an ephemeral secure bucket for the duration of the "Alchemy" process. Persistent storage only occurs upon the formal creation of an Artist Profile.
                      </p>
                      <ul className="list-disc pl-5 text-sm font-bold text-blue-slate space-y-2">
                        <li>Visual Data: Base64 encoded streams of your original sketches.</li>
                        <li>Metadata: Child's name, age, and grade as provided by the guardian.</li>
                        <li>Communication: Secure email handling via Resend for order tracking and magic tips.</li>
                      </ul>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-2xl font-black text-gunmetal uppercase tracking-tight flex items-center gap-3">
                        <span className="text-pacific-cyan">02.</span> AI Ethics & Model Usage
                      </h3>
                      <p className="text-blue-slate font-medium leading-relaxed">
                        We leverage the Google Gemini 3 and Veo 3.1 models. Under our enterprise agreement, your inputs (drawings) and outputs (animations/books) are processed in a "Zero-Retention" secure context. <strong>None of the artwork uploaded to this Studio is used to train, improve, or influence public foundational models.</strong> Your magic stays in your family.
                      </p>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-2xl font-black text-gunmetal uppercase tracking-tight flex items-center gap-3">
                        <span className="text-pacific-cyan">03.</span> COPPA Compliance (Children's Privacy)
                      </h3>
                      <p className="text-blue-slate font-medium leading-relaxed">
                        We adhere to the Children's Online Privacy Protection Act. This studio is intended to be used by Parents or Legal Guardians. We do not knowingly collect personal information directly from children under 13. Any "Artist Name" or "Age" data is provided by the adult guardian for the sole purpose of book personalization.
                      </p>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-2xl font-black text-gunmetal uppercase tracking-tight flex items-center gap-3">
                        <span className="text-pacific-cyan">04.</span> Security Architecture
                      </h3>
                      <p className="text-blue-slate font-medium leading-relaxed">
                        All data transmissions are protected by TLS 1.3 encryption. Financial data is never handled directly by the Studio; it is processed through Stripe's PCI-compliant infrastructure. Archive books are generated on isolated servers and deleted 30 days after physical shipping is confirmed.
                      </p>
                    </section>
                  </div>
                ) : (
                  <div className="space-y-12">
                    <section className="space-y-4">
                      <h3 className="text-2xl font-black text-gunmetal uppercase tracking-tight flex items-center gap-3">
                        <span className="text-pacific-cyan">01.</span> The Artisan's Accord
                      </h3>
                      <p className="text-blue-slate font-medium leading-relaxed">
                        By accessing Once Upon a Drawing, you agree to these terms. You must be at least 18 years of age or the age of legal majority in your jurisdiction to create an account and authorize the processing of a minor's artwork.
                      </p>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-2xl font-black text-gunmetal uppercase tracking-tight flex items-center gap-3">
                        <span className="text-pacific-cyan">02.</span> Intellectual Property & Licensing
                      </h3>
                      <p className="text-blue-slate font-medium leading-relaxed">
                        The User retains full copyright of the original uploaded artwork. By using the service, you grant Sweetwater Technologies a non-exclusive, worldwide, royalty-free, temporary license to reproduce, modify, and transform the artwork into "Studio Output" (Animations and Books). This license is revoked upon account deletion or after the 30-day archival period for guest orders.
                      </p>
                      <p className="text-blue-slate font-medium leading-relaxed">
                        <strong>Promotional Use:</strong> You also grant Sweetwater Technologies a non-exclusive, worldwide, royalty-free, perpetual license to use, display, and reproduce your uploaded artwork and resulting Studio Output in promotional materials, marketing content, social media, website galleries, and advertising. We will never sell your artwork to third parties, and any promotional use will be to showcase the magic of our service. If you prefer your creations not be featured, you may opt out by contacting us at team@onceuponadrawing.com.
                      </p>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-2xl font-black text-gunmetal uppercase tracking-tight flex items-center gap-3">
                        <span className="text-pacific-cyan">03.</span> Acceptable Use & Content Guidelines
                      </h3>
                      <p className="text-blue-slate font-medium leading-relaxed">
                        Once Upon a Drawing is designed to transform children's artwork into magical stories. To maintain a safe and family-friendly environment, you agree NOT to upload, submit, or share any content that:
                      </p>
                      <ul className="list-disc pl-5 text-sm font-bold text-blue-slate space-y-2">
                        <li>Depicts violence, gore, weapons, or harmful activities</li>
                        <li>Contains nudity, sexually explicit material, or adult content</li>
                        <li>Promotes hate speech, discrimination, or harassment</li>
                        <li>Depicts illegal activities or substances</li>
                        <li>Contains personal information of others without consent</li>
                        <li>Infringes on copyrights, trademarks, or intellectual property rights of others</li>
                        <li>Is intended to deceive, defraud, or mislead</li>
                      </ul>
                      <p className="text-blue-slate font-medium leading-relaxed mt-4">
                        We reserve the right to remove any content that violates these guidelines and to suspend or terminate accounts of users who repeatedly violate these terms. Violations may be reported to appropriate authorities where required by law.
                      </p>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-2xl font-black text-gunmetal uppercase tracking-tight flex items-center gap-3">
                        <span className="text-pacific-cyan">04.</span> Nature of AI Generation
                      </h3>
                      <p className="text-blue-slate font-medium leading-relaxed italic">
                        Generative AI is a collaboration, not a Xerox machine. The Studio utilizes advanced algorithms to interpret your child's drawings. You acknowledge that AI outputs (Story text and 3D renders) are creative interpretations and may not perfectly mirror the original intent or visual fidelity of the source sketch.
                      </p>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-2xl font-black text-gunmetal uppercase tracking-tight flex items-center gap-3">
                        <span className="text-pacific-cyan">05.</span> Physical Goods & Shipping
                      </h3>
                      <p className="text-blue-slate font-medium leading-relaxed">
                        Archival Hardcovers are custom-manufactured upon order. "Once Upon a Drawing Logistics" handles the coordination of printing and distribution. Due to the highly personalized nature of archival books, all sales are final. Replacements are only issued for manufacturing defects or damage during transit.
                      </p>
                    </section>

                    <section className="space-y-4">
                      <h3 className="text-2xl font-black text-gunmetal uppercase tracking-tight flex items-center gap-3">
                        <span className="text-pacific-cyan">06.</span> Limitation of Liability
                      </h3>
                      <p className="text-blue-slate font-medium leading-relaxed">
                        The Studio provides magic on an "as-is" basis. We are not liable for emotional distress caused by a dragon having two heads instead of one, or for lost packages once they have entered the logistics stream.
                      </p>
                    </section>
                  </div>
                )}
               </div>

               {/* Archival Seal */}
               <div className="pt-12 mt-12 border-t-4 border-dashed border-silver flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full border-8 border-silver/20 flex items-center justify-center grayscale opacity-30 select-none">
                    <span className="text-4xl">🏛️</span>
                  </div>
                  <p className="text-[10px] font-black text-silver uppercase tracking-[0.5em] mt-4">Studio Archives • Sweetwater Tech</p>
               </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-off-white overflow-y-auto selection:bg-pacific-cyan/30">
      <div className="fixed inset-0 pointer-events-none opacity-40 -z-10">
         <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')]"></div>
         <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-soft-gold/20 blur-[150px] rounded-full animate-pulse"></div>
         <div className="absolute bottom-[-10%] left-[-20%] w-[50%] h-[50%] bg-pacific-cyan/10 blur-[120px] rounded-full animate-blob"></div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-24 relative">
        <button 
          onClick={onClose}
          className="fixed top-8 right-8 w-16 h-16 bg-white shadow-3xl rounded-full flex items-center justify-center text-gunmetal text-2xl hover:scale-110 active:scale-95 transition-all z-[210] border-4 border-silver group"
        >
          <span className="group-hover:rotate-90 transition-transform">✕</span>
        </button>
        
        {renderContent()}

        <div className="mt-32 pt-20 border-t-8 border-dashed border-silver/20 text-center space-y-12">
          <div className="flex flex-col items-center gap-6">
            <Button variant="secondary" onClick={onClose} size="xl" className="shadow-2xl">
              Back to the Drawing Board
            </Button>
            <p className="text-[10px] text-silver font-black uppercase tracking-[0.6em] animate-pulse">
              End of Archive
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-8 opacity-20 grayscale grayscale-100 hover:grayscale-0 hover:opacity-100 transition-all duration-1000">
               {['⚡', '💧', '🎨', '📖', '✨'].map((e, i) => (
                 <span key={i} className="text-3xl animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}>{e}</span>
               ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .shadow-3xl {
          box-shadow: 0 35px 60px -15px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
};

export default InfoPages;
