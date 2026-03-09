import imgHeroImage from "figma:asset/df27fb1b971dffe928c194d3b69bceace8012400.png";
import imgImage from "figma:asset/5dc5b89d5bb6610e0c3299ca165a3fdf4a1f104d.png";

function Header() {
  return (
    <div className="content-stretch flex flex-col items-center leading-none pb-[8px] relative shrink-0 text-[80px] w-full" data-name="Header">
      <h1 className="block font-['Source_Serif_Pro:Regular',sans-serif] not-italic relative shrink-0 tracking-[-3.2px] w-full">Sustainability insights,</h1>
      <h2 className="block font-['Radio_Canada_Big:Regular',sans-serif] font-normal relative shrink-0 tracking-[-4px] w-full">built for business</h2>
    </div>
  );
}

function HeaderText() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-center relative shrink-0 text-black text-center w-full" data-name="Header text">
      <Header />
      <p className="font-['Source_Serif_Pro:Regular',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[20px] tracking-[-0.8px] w-full">Track impact, reduce emissions, and accelerate progress—with clarity and confidence.</p>
    </div>
  );
}

function ButtonRow() {
  return (
    <div className="content-stretch cursor-pointer flex gap-[16px] items-center relative shrink-0" data-name="Button row">
      <a className="bg-black content-stretch flex gap-[10px] items-center justify-center p-[16px] relative shrink-0" data-name="Button primary" href="https://figma.com/sites">
        <div className="bg-white shrink-0 size-[4px]" data-name="Bullet" />
        <p className="font-['Geist_Mono:Medium',sans-serif] font-medium leading-none relative shrink-0 text-[14px] text-left text-white whitespace-nowrap">Request a demo</p>
      </a>
      <button className="bg-black content-stretch flex gap-[10px] items-center justify-center p-[16px] relative shrink-0" data-name="Button primary">
        <div className="bg-white shrink-0 size-[4px]" data-name="Bullet" />
        <p className="font-['Geist_Mono:Medium',sans-serif] font-medium leading-none relative shrink-0 text-[14px] text-left text-white whitespace-nowrap">Explore the platform</p>
      </button>
    </div>
  );
}

function IntroContent() {
  return (
    <div className="content-stretch flex flex-col gap-[32px] items-center max-w-[1030px] relative shrink-0 w-full" data-name="Intro content">
      <HeaderText />
      <ButtonRow />
    </div>
  );
}

function IntroSection() {
  return (
    <header className="relative shrink-0 w-full" data-name="Intro section">
      <div className="flex flex-col items-center size-full">
        <div className="content-stretch flex flex-col gap-[56px] items-center pt-[140px] px-[20px] relative w-full">
          <IntroContent />
          <div className="h-[608px] pointer-events-none relative rounded-[24px] shrink-0 w-[960px]" data-name="Hero image">
            <img alt="Software dashboard showing sustainability metrics including energy use, emissions trend, and goal progress" className="absolute inset-0 max-w-none object-cover rounded-[24px] size-full" src={imgHeroImage} />
            <div aria-hidden="true" className="absolute border-2 border-black border-solid inset-0 rounded-[24px]" />
          </div>
        </div>
      </div>
    </header>
  );
}

function Image() {
  return (
    <div className="h-[502px] relative shrink-0 w-[693px]" data-name="Image">
      <img alt="UI card displaying energy consumption data on a light fabric background" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage} />
    </div>
  );
}

function Header1() {
  return (
    <li className="content-stretch flex gap-[16px] items-start leading-none relative shrink-0 w-full" data-name="Header">
      <h2 className="block flex-[1_0_0] font-['Radio_Canada_Big:Medium',sans-serif] font-medium min-h-px min-w-px relative text-[20px] text-black tracking-[-0.4px]">Track</h2>
      <p className="font-['Geist_Mono:Regular',sans-serif] font-normal relative shrink-0 text-[#6c6c6c] text-[14px] text-right whitespace-nowrap">001</p>
    </li>
  );
}

function ListItem() {
  return (
    <ul className="content-stretch flex flex-col gap-[16px] items-start py-[24px] relative shrink-0 w-full" data-name="List item 1">
      <div aria-hidden="true" className="absolute border-[#dbe0ec] border-solid border-t inset-0 pointer-events-none" />
      <Header1 />
      <li className="block font-['Source_Serif_Pro:Regular',sans-serif] leading-[0] not-italic relative shrink-0 text-[20px] text-black tracking-[-0.8px] w-full">
        <p className="leading-[1.2]">Emissions, energy, and waste across your value chain</p>
      </li>
    </ul>
  );
}

function Header2() {
  return (
    <li className="content-stretch flex gap-[16px] items-start leading-none relative shrink-0 w-full" data-name="Header">
      <h2 className="block flex-[1_0_0] font-['Radio_Canada_Big:Medium',sans-serif] font-medium min-h-px min-w-px relative text-[20px] text-black tracking-[-0.4px]">Model</h2>
      <p className="font-['Geist_Mono:Regular',sans-serif] font-normal relative shrink-0 text-[#6c6c6c] text-[14px] text-right whitespace-nowrap">002</p>
    </li>
  );
}

function ListItem1() {
  return (
    <ul className="content-stretch flex flex-col gap-[16px] items-start py-[24px] relative shrink-0 w-full" data-name="List item 2">
      <div aria-hidden="true" className="absolute border-[#dbe0ec] border-solid border-t inset-0 pointer-events-none" />
      <Header2 />
      <li className="block font-['Source_Serif_Pro:Regular',sans-serif] leading-[0] not-italic relative shrink-0 text-[20px] text-black tracking-[-0.8px] w-full">
        <p className="leading-[1.2]">Forecast performance and goal alignment</p>
      </li>
    </ul>
  );
}

function Header3() {
  return (
    <li className="content-stretch flex gap-[16px] items-start leading-none relative shrink-0 w-full" data-name="Header">
      <h2 className="block flex-[1_0_0] font-['Radio_Canada_Big:Medium',sans-serif] font-medium min-h-px min-w-px relative text-[20px] text-black tracking-[-0.4px]">Report</h2>
      <p className="font-['Geist_Mono:Regular',sans-serif] font-normal relative shrink-0 text-[#6c6c6c] text-[14px] text-right whitespace-nowrap">003</p>
    </li>
  );
}

function ListItem2() {
  return (
    <ul className="content-stretch flex flex-col gap-[16px] items-start py-[24px] relative shrink-0 w-full" data-name="List item 3">
      <div aria-hidden="true" className="absolute border-[#dbe0ec] border-solid border-t inset-0 pointer-events-none" />
      <Header3 />
      <li className="block font-['Source_Serif_Pro:Regular',sans-serif] leading-[0] not-italic relative shrink-0 text-[20px] text-black tracking-[-0.8px] w-full">
        <p className="leading-[1.2]">Generate ESG disclosures, automate frameworks</p>
      </li>
    </ul>
  );
}

function Header4() {
  return (
    <li className="content-stretch flex gap-[16px] items-start leading-none relative shrink-0 w-full" data-name="Header">
      <h2 className="block flex-[1_0_0] font-['Radio_Canada_Big:Medium',sans-serif] font-medium min-h-px min-w-px relative text-[20px] text-black tracking-[-0.4px]">Act</h2>
      <p className="font-['Geist_Mono:Regular',sans-serif] font-normal relative shrink-0 text-[#6c6c6c] text-[14px] text-right whitespace-nowrap">004</p>
    </li>
  );
}

function ListItem3() {
  return (
    <ul className="content-stretch flex flex-col gap-[16px] items-start py-[24px] relative shrink-0 w-full" data-name="List item 4">
      <div aria-hidden="true" className="absolute border-[#dbe0ec] border-b border-solid border-t inset-0 pointer-events-none" />
      <Header4 />
      <li className="block font-['Source_Serif_Pro:Regular',sans-serif] leading-[0] not-italic relative shrink-0 text-[20px] text-black tracking-[-0.8px] w-full">
        <p className="leading-[1.2]">Surface insights and operational next steps</p>
      </li>
    </ul>
  );
}

function ItemList() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Item list">
      <ListItem />
      <ListItem1 />
      <ListItem2 />
      <ListItem3 />
    </div>
  );
}

function FeatureList() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[24px] items-start min-h-px min-w-px relative" data-name="Feature list">
      <ItemList />
      <a className="bg-black content-stretch cursor-pointer flex gap-[10px] items-center justify-center p-[16px] relative shrink-0" data-name="Button primary" href="https://figma.com/sites">
        <div className="bg-white shrink-0 size-[4px]" data-name="Bullet" />
        <p className="font-['Geist_Mono:Medium',sans-serif] font-medium leading-none relative shrink-0 text-[14px] text-left text-white whitespace-nowrap">Explore features</p>
      </a>
    </div>
  );
}

function Content() {
  return (
    <div className="content-stretch flex gap-[40px] items-center max-w-[1500px] relative shrink-0 w-full" data-name="Content">
      <Image />
      <FeatureList />
    </div>
  );
}

function FeaturesSection() {
  return (
    <main className="relative shrink-0 w-full" data-name="Features section" tabIndex="-1">
      <div className="flex flex-col items-center size-full">
        <div className="content-stretch flex flex-col gap-[40px] items-center px-[20px] py-[120px] relative w-full">
          <h2 className="block font-['Radio_Canada_Big:Medium',sans-serif] font-medium leading-none max-w-[612px] relative shrink-0 text-[40px] text-black text-center tracking-[-1.2px] w-full">Everything you need to measure, model, and act on sustainability</h2>
          <Content />
        </div>
      </div>
    </main>
  );
}

export default function IntroFeaturesSection() {
  return (
    <div className="content-stretch flex flex-col items-start relative size-full" data-name="Intro + Features section">
      <div className="absolute bg-gradient-to-b from-[#a8d3ff] inset-[0_0_58.25%_0] to-[#fff4df]" data-name="Gradient background" />
      <IntroSection />
      <FeaturesSection />
    </div>
  );
}