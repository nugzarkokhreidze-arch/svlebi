import Link from "next/link";

type TileColor = "red" | "black" | "yellow" | "green";

type TileInfo = {
  name: string;
  symbol: string;
  color: TileColor;
  count: string;
  meaning: string;
};

const redTiles: TileInfo[] = [
  { name: "შეთანხმება", symbol: "🤝", color: "red", count: "1", meaning: "საერთო პირობების მიღწევა და პოზიციების დაახლოება." },
  { name: "პარტნიორობა", symbol: "🤝", color: "red", count: "1", meaning: "გრძელვადიანი თანამშრომლობის შეთავაზება." },
  { name: "ლოიალობა", symbol: "🛡", color: "red", count: "1", meaning: "მხარდაჭერის, ერთგულებისა და ნდობის გამოხატვა." },
  { name: "ალიანსი", symbol: "+", color: "red", count: "1", meaning: "მოთამაშეებს შორის ძალების გაერთიანება საერთო მიზნისთვის." },
  { name: "მეგობრობა", symbol: "☀", color: "red", count: "1", meaning: "კეთილგანწყობის და რბილი პოლიტიკური კავშირის სვლა." },
  { name: "ცვლილება", symbol: "↺", color: "red", count: "1", meaning: "სტრატეგიის, მიმართულების ან პოლიტიკური პოზიციის შეცვლა." },
  { name: "გასაიდუმლოება", symbol: "☷", color: "red", count: "1", meaning: "დახურული შეთანხმება ან ინფორმაციის დროებით დაფარვა." },
  { name: "ნეიტრალობა", symbol: "0", color: "red", count: "1", meaning: "პოზიციის დროებით არ დაფიქსირება ან კონფლიქტისგან დისტანცირება." },
  { name: "კონსენსუსი", symbol: "◎", color: "red", count: "1", meaning: "ყველასთვის მისაღები გადაწყვეტილების ძიება." },
  { name: "გარიგება", symbol: "♦", color: "red", count: "1", meaning: "ინტერესების გაცვლა შეთანხმების მისაღწევად." },
  { name: "დანათესავება", symbol: "∞", color: "red", count: "1", meaning: "კავშირის გამყარება პირადი, ჯგუფური ან სტრატეგიული სიახლოვით." },
  { name: "მხილება", symbol: "!", color: "red", count: "1", meaning: "მიმღები მოთამაშე წესის მიხედვით დროებით აჩვენებს თავის კენჭებს." },
  { name: "დიალოგი", symbol: "💬", color: "red", count: "1", meaning: "მოლაპარაკების, ახსნის ან ახალი ურთიერთობის გახსნა." },
];

const blackTiles: TileInfo[] = [
  { name: "თვალთვალი", symbol: "👁", color: "black", count: "1", meaning: "ინფორმაციის ფარული შეგროვება სხვა მოთამაშის ქცევის გასაგებად." },
  { name: "მანიპულაცია", symbol: "M", color: "black", count: "1", meaning: "სხვის გადაწყვეტილებაზე ირიბი გავლენის მოხდენა." },
  { name: "ავანტურა", symbol: "!", color: "black", count: "1", meaning: "რისკიანი, არაპროგნოზირებადი და გამბედავი პოლიტიკური ნაბიჯი." },
  { name: "ფალსიფიცირება", symbol: "F", color: "black", count: "1", meaning: "ინფორმაციის, შედეგის ან პროცესის დამახინჯება." },
  { name: "ჰაკერობა", symbol: "#", color: "black", count: "1", meaning: "მიმღები მოთამაშე წესის მიხედვით დროებით აჩვენებს თავის კენჭებს." },
  { name: "ჩაშვება", symbol: "↓", color: "black", count: "1", meaning: "მიმღები მოთამაშე ბაზრიდან იღებს 2 დამატებით კენჭს." },
  { name: "ღალატი", symbol: "!", color: "black", count: "1", meaning: "მიმღები მოთამაშე ბაზრიდან იღებს 3 დამატებით კენჭს." },
  { name: "ანგარიშსწორება", symbol: "!", color: "black", count: "1", meaning: "მიმღები მოთამაშე ბაზრიდან იღებს 1 დამატებით კენჭს." },
  { name: "მოსყიდვა", symbol: "$", color: "black", count: "1", meaning: "რესურსის გამოყენებით გავლენის მოპოვება ან პოზიციის შეცვლა." },
  { name: "თავდასხმა", symbol: "⚡", color: "black", count: "1", meaning: "პირდაპირი დაპირისპირების ან ზეწოლის სვლა." },
  { name: "განეიტრალება", symbol: "−", color: "black", count: "1", meaning: "სხვისი გავლენის, სვლის ან ძალის შესუსტება." },
  { name: "გადაბირება", symbol: "↔", color: "black", count: "1", meaning: "სხვა მოთამაშის პოზიციის ან მხარის შეცვლის მცდელობა." },
];

const moneyTiles: TileInfo[] = Array.from({ length: 10 }, (_, index) => ({
  name: "თანხა",
  symbol: String(index + 1),
  color: "yellow" as const,
  count: "1",
  meaning: `სიმბოლური ${index + 1} მილიონი. გამოიყენება შეთანხმების, გავლენის ან დაპირისპირების ფასის განსაზღვრისთვის.`,
}));

const specialTiles: TileInfo[] = [
  { name: "+", symbol: "+", color: "red", count: "1", meaning: "წითელი + აძლიერებს პოზიტიურ ან შეთანხმებით სვლას." },
  { name: "+", symbol: "+", color: "black", count: "1", meaning: "შავი + აძლიერებს ზეწოლის ან დაპირისპირების სვლას." },
  { name: "-", symbol: "−", color: "red", count: "1", meaning: "წითელი − ამცირებს შეთანხმების ან პოზიტიური სვლის ძალას." },
  { name: "-", symbol: "−", color: "black", count: "1", meaning: "შავი − ამცირებს მოწინააღმდეგის პოზიციის ძალას." },
  { name: "0", symbol: "0", color: "red", count: "1", meaning: "წინადადების აცილება, პოზიციის დროებით შეჩერება ან პასუხისგან თავის არიდება." },
  { name: "0", symbol: "0", color: "black", count: "1", meaning: "დაპირისპირების ან ზეწოლის სვლისგან თავის დაცვა." },
  { name: "0", symbol: "0", color: "yellow", count: "1", meaning: "ნულოვანი ფასი, თანხობრივ შეთავაზებაზე უარი ან ფინანსური აცილება." },
  { name: "↻", symbol: "↻", color: "red", count: "1", meaning: "ცვლის თამაშის მიმართულებას შეთანხმებითი ხაზის ფარგლებში." },
  { name: "↻", symbol: "↻", color: "black", count: "1", meaning: "ცვლის დაპირისპირების მიმართულებას და არღვევს წინასწარ გათვლილ ხაზს." },
  { name: "↻", symbol: "↻", color: "yellow", count: "1", meaning: "ცვლის რესურსების ან თანხობრივი შეთავაზების მოძრაობის მიმართულებას." },
  { name: "L", symbol: "L", color: "red", count: "1", meaning: "თანამშრომლობითი ლიდერობის გამოცხადება." },
  { name: "L", symbol: "L", color: "black", count: "1", meaning: "ძალაუფლებრივი ლიდერობის გამოცხადება." },
  { name: "L", symbol: "L", color: "yellow", count: "1", meaning: "რესურსებზე დაფუძნებული ლიდერობის გამოცხადება." },
  { name: "∞", symbol: "∞", color: "red", count: "1", meaning: "თამაშის ან შეთანხმებითი ციკლის განახლება." },
  { name: "∞", symbol: "∞", color: "black", count: "1", meaning: "კონფლიქტური ან დაპირისპირებული ციკლის განახლება." },
  { name: "სვლა", symbol: "♛", color: "green", count: "1", meaning: "თამაშის საწყისი კენჭი. აქედან იწყება პოლიტიკური ჯაჭვი." },
];

function TilePreview({ tile }: { tile: TileInfo }) {
  return (
    <div className={`homeTile homeTile-${tile.color}`}>
      <div className="homeTileName">{tile.name}</div>
      <div className="homeTileDivider" />
      <div className="homeTileSymbol">{tile.symbol}</div>
    </div>
  );
}

function TileCatalog({ title, subtitle, tiles }: { title: string; subtitle: string; tiles: TileInfo[] }) {
  return (
    <section className="tileCatalogBlock">
      <div className="catalogHead">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>

      <div className="tileCatalogGrid">
        {tiles.map((tile, index) => (
          <article className="tileMeaningCard" key={`${tile.name}-${tile.symbol}-${tile.color}-${index}`}>
            <TilePreview tile={tile} />
            <div>
              <div className="tileMeaningTitle">
                <strong>{tile.name}</strong>
                <span>{tile.count} ცალი</span>
              </div>
              <p>{tile.meaning}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="homePageV2">
      <header className="homeHeaderV2">
        <a className="homeLogoV2" href="#">
          <span>ს</span>
          <strong>სვლები</strong>
        </a>

        <nav className="homeNavV2">
          <a href="#goal">მიზანი</a>
          <a href="#rules">წესები</a>
          <a href="#learn">რას ასწავლის</a>
        </nav>

        <Link className="homeStartButton" href="/setup">
          დაწყება
        </Link>
      </header>

      <section className="homeHeroV2">
        <div className="homeHeroText">
          <p className="eyebrow">სტრატეგიული თამაში პოლიტიკის შესახებ</p>
          <h1>სვლები</h1>
          <h2>
            პოლიტიკა ხელოვნებაა.
            <br />
            იმეცადინე იყო კარგი
            <br />
            პოლიტიკოსი.
          </h2>
          <p className="heroDescription">
            „სვლები“ არის სტრატეგიული თამაში, სადაც მოთამაშეები იღებენ გადაწყვეტილებებს,
            აგზავნიან წინადადებებს, ქმნიან ალიანსებს, იყენებენ რესურსებს და ცდილობენ
            გამარჯვებას. თამაშის ბოლოს კი ხედავენ, როგორ ჰგავდა მათი მოქმედებები რეალურ
            პოლიტიკურ პროცესებს.
          </p>

          <div className="heroActions">
            <Link href="/setup?mode=solo">ითამაშე მარტო</Link>
            <Link href="/setup?mode=group">მეგობრებთან ერთად</Link>
          </div>
        </div>

        <div className="homeHeroVisual heroLogoVisual">
          <div className="heroLogoBox">
            <img
              src="/svlebi-wheel-logo.png"
              alt="სვლები თამაშის ლოგო"
              className="heroLogoImage"
            />
          </div>
        </div>
      </section>

      <section className="contentShellV2">
        <section className="infoSection" id="goal">
          <p className="sectionKicker">თამაშის მიზანი</p>
          <h2>მოიგე სვლებით, ალიანსებით ან ლიდერობით</h2>
          <p>
            თამაშის მთავარი მიზანია მოთამაშემ თავისი სვლებით, მოლაპარაკებებით, ალიანსებით
            და ტაქტიკური გადაწყვეტილებებით პირველმა დაცალოს საკუთარი კენჭები ან გახდეს
            გამარჯვებული ალიანსის ნაწილი.
          </p>

          <div className="threeCards">
            <article>
              <h3>ინდივიდუალური გამარჯვება</h3>
              <p>მოთამაშე იგებს, თუ პირველი გამოიყენებს ყველა მის ხელში არსებულ კენჭს.</p>
            </article>
            <article>
              <h3>ალიანსის გამარჯვება</h3>
              <p>თუ გამარჯვებული მოთამაშე ალიანსშია, გამარჯვებულებად შეიძლება ჩაითვალონ მისი ალიანსის წევრებიც.</p>
            </article>
            <article>
              <h3>ლიდერის გამარჯვება</h3>
              <p>თუ L კენჭით გამოცხადებული ლიდერობის ქვეშ დასრულდა თამაში, ლიდერს შეუძლია გამარჯვება მიიღოს.</p>
            </article>
          </div>
        </section>

        <section className="infoSection" id="rules">
          <p className="sectionKicker">თამაშის წესები</p>
          <h2>როგორ მიმდინარეობს თამაში</h2>

          <div className="rulesGrid">
            <article><span>1</span><h3>თამაშში ყოველთვის 6 მოთამაშეა</h3><p>თუ რეალური მოთამაშეები 6-ზე ნაკლებია, თავისუფალ ადგილებს AI მოთამაშეები ავსებენ.</p></article>
            <article><span>2</span><h3>თითოეული იწყებს 6 კენჭით</h3><p>სისტემა ურევს 51 კენჭს და თითოეულ მოთამაშეს ურიგებს 6 კენჭს.</p></article>
            <article><span>3</span><h3>მოთამაშე ხედავს მხოლოდ საკუთარ კენჭებს</h3><p>სხვისი კენჭები დაფარულია. ჩანს მხოლოდ მათი რაოდენობა.</p></article>
            <article><span>4</span><h3>სვლა კეთდება კონკრეტული მოთამაშის მიმართ</h3><p>კენჭი უბრალოდ მაგიდაზე არ იდება — ის კონკრეტული მოთამაშისკენ მიმართული პოლიტიკური ნაბიჯია.</p></article>
            <article><span>5</span><h3>მიმღები პასუხობს მაშინვე</h3><p>თუ მოთამაშემ მიიღო წინადადება, მას შეუძლია უპასუხოს, გამოიყენოს 0, მოითხოვოს თანხა ან შეცვალოს მიმართულება.</p></article>
            <article><span>6</span><h3>ერთნაირი ფერი ერთმანეთს არ ებმის</h3><p>წითელ ფუნქციურ კენჭზე პირდაპირ წითელი არ მიდის, შავზე კი პირდაპირ შავი არ მიდის.</p></article>
            <article><span>7</span><h3>ბაზარი გამოიყენება საჭიროებისას</h3><p>თუ მოთამაშეს შესაბამისი კენჭი არ აქვს, იღებს ბაზრიდან ან სპეციალური კენჭის ეფექტით იღებს დამატებით კენჭებს.</p></article>
            <article><span>8</span><h3>სპეციალური ეფექტები ავტომატურად სრულდება</h3><p>0, ↻, L, ∞, +, − და სხვა სპეციალური კენჭები თამაშის დინამიკას ცვლიან.</p></article>
            <article><span>9</span><h3>ყველა სვლა იწერება ჟურნალში</h3><p>ჟურნალი აჩვენებს ვინ, რა კენჭი, ვის მიმართ გამოიყენა და როგორ განვითარდა თამაში.</p></article>
            <article><span>10</span><h3>თამაშის ბოლოს ხდება გააზრება</h3><p>სისტემა აჩვენებს ვინ ქმნიდა ალიანსებს, ვინ იყენებდა შავ სვლებს, ვინ იყო ნეიტრალური და ვინ ლიდერობდა.</p></article>
          </div>
        </section>

        <section className="infoSection">
          <p className="sectionKicker">კენჭების კატალოგი</p>
          <h2>ყველა კენჭი და მათი მნიშვნელობა</h2>

          <TileCatalog title="წითელი კენჭები — დადებითი წინადადებები" subtitle="თანამშრომლობა, შეთანხმება, ალიანსი, ნდობა და პოლიტიკური დიალოგი." tiles={redTiles} />
          <TileCatalog title="შავი კენჭები — დაპირისპირება და ზეწოლა" subtitle="კონფლიქტი, რისკი, მანიპულაცია, შეტევა და გავლენის მოპოვება." tiles={blackTiles} />
          <TileCatalog title="ყვითელი კენჭები — თანხა და რესურსი" subtitle="სიმბოლური მილიონები, რომლებიც გამოიყენება შეთანხმების ფასისა და გავლენის განსაზღვრისთვის." tiles={moneyTiles} />
          <TileCatalog title="სპეციალური კენჭები" subtitle="+, −, 0, ↻, L, ∞ და სვლა — თამაშის მიმართულების, ძალის და ლიდერობის შეცვლისთვის." tiles={specialTiles} />
        </section>

        <section className="infoSection" id="learn">
          <p className="sectionKicker">რას ასწავლის თამაში</p>
          <h2>თამაშის შემდეგ მოთამაშე ხედავს საკუთარ პოლიტიკურ ქცევას</h2>

          <div className="learnGrid">
            <article><h3>სტრატეგიული აზროვნება</h3><p>როგორ დაგეგმო რამდენიმე სვლა წინასწარ და შეაფასო რისკი.</p></article>
            <article><h3>მოლაპარაკება</h3><p>როგორ შესთავაზო ალიანსი, ნეიტრალობა, გარიგება ან პარტნიორობა.</p></article>
            <article><h3>ალიანსების ფასი</h3><p>რატომ არის თანამშრომლობა სასარგებლო, მაგრამ ზოგჯერ სარისკოც.</p></article>
            <article><h3>ზეწოლის შედეგები</h3><p>როგორ ცვლის თამაშის დინამიკას შავი სვლები და კონფლიქტური ქმედებები.</p></article>
            <article><h3>რესურსებით ვაჭრობა</h3><p>როგორ გამოიყენება თანხა შეთანხმების, გავლენის ან დაპირისპირების ფასის დასადგენად.</p></article>
            <article><h3>ლიდერობის დინამიკა</h3><p>როგორ ცვლის პროცესს მოთამაშე, რომელიც საკუთარ თავს ლიდერად აცხადებს.</p></article>
          </div>
        </section>
      </section>
    
      {/* Author Section */}
      <section className="authorSection">
        <div className="authorCard">
          <p className="authorKicker">ავტორი</p>
          <h2>თამაშის ავტორი: ნუგზარ კოხრეიძე</h2>

          <p>
            თამაში შექმნილია RICDOG საგანმანათლებლო პროგრამის ფარგლებში.
          </p>

          <div className="authorInfoBlock">
            <h3>ინფორმაცია RICDOG-ის შესახებ</h3>
            <p>
              სამეცნიერო-ინტელექტუალური კლუბი “თაობათა დიალოგი” (RICDOG) –
              სათემო ტიპის ორგანიზაციაა, რომელიც საკუთარ თავს საზოგადოების
              მოდელად ხედავს.
            </p>
            <p>
              ორგანიზაციის გამოცდილებამ აჩვენა, რომ საქართველოში შესაძლებელია
              მრავალფეროვან გარემოში ურთიერთთანამშრომლობა, ცხოვრება,
              ურთიერთობა და ერთობლივი საქმის კეთება.
            </p>
            <p>
              RICDOG-ის განვლილმა წლებმა აჩვენა, რომ საუკეთესო შედეგი მიიღწევა,
              როდესაც განსხვავებული თაობის ადამიანები თანამშრომლობენ და
              ერთიანი ძალებით ქმნიან სიახლეებს, აგვარებენ გამოწვევებს და
              აზიარებენ ცოდნას.
            </p>
          </div>

          <div className="authorSupportBox">
            <h3>მხარდაჭერა</h3>
            <p>
              მივესალმებით ფინანსურ მხარდაჭერას (დონაციას) საგანმანათლებლო
              რესურსების შექმნისთვის.
            </p>
            <p>
              მოგვწერეთ: <a href="mailto:ricdog@live.com">ricdog@live.com</a>
            </p>
            <p>
              ვებგვერდი:{" "}
              <a href="https://www.ricdog.org" target="_blank" rel="noreferrer">
                www.ricdog.org
              </a>
            </p>
          </div>
        </div>
      </section>

    </main>
  );
}
