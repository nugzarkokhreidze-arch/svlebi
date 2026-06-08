export default function HomePage() {
  return (
    <main className="page">
      <header className="topbar">
        <a className="logo" href="/">
          <span className="logoMark">ს</span>
          <span>სვლები</span>
        </a>

        <nav className="nav">
          <a href="#goal">მიზანი</a>
          <a href="#rules">წესები</a>
          <a href="#learn">რას ასწავლის</a>
        </nav>

        <a className="smallButton" href="/setup">
          დაწყება
        </a>
      </header>

      <section className="hero">
        <div className="heroText">
          <p className="label">სტრატეგიული თამაში პოლიტიკის შესახებ</p>

          <h1>სვლები</h1>

          <h2>პოლიტიკა ხელოვნებაა. იმეცადინე იყო კარგი პოლიტიკოსი.</h2>

          <p className="description">
            „სვლები“ არის სტრატეგიული თამაში, სადაც მოთამაშეები იღებენ
            გადაწყვეტილებებს, აგზავნიან წინადადებებს, ქმნიან ალიანსებს,
            იყენებენ რესურსებს და ცდილობენ გამარჯვებას. თამაშის ბოლოს კი
            ხედავენ, როგორ ჰგავდა მათი მოქმედებები რეალურ პოლიტიკურ პროცესებს.
          </p>

          <div className="actions">
            <a className="primaryButton" href="/setup?mode=solo">
              მარტო
            </a>

            <a className="secondaryButton" href="/setup?mode=group">
              მეგობრებთან ერთად
            </a>
          </div>

          <div className="miniFacts">
            <span>6 მოთამაშე</span>
            <span>AI ავსებს ცარიელ ადგილებს</span>
            <span>დომინოს მსგავსი კენჭები</span>
          </div>
        </div>

        <div className="heroImage" aria-hidden="true">
          <div className="gamePreview">
            <div className="previewBoard">
              <div className="tile redTile">
                <span>ალიანსი</span>
                <b>+</b>
              </div>

              <div className="tile blackTile">
                <span>მოსყიდვა</span>
                <b>L</b>
              </div>

              <div className="tile neutralTile">
                <span>სვლა</span>
                <b>♛</b>
              </div>

              <div className="tile moneyTile">
                <span>თანხა</span>
                <b>5</b>
              </div>
            </div>

            <div className="previewPlayers">
              <span>ნინო AI</span>
              <span>თქვენ</span>
              <span>გიორგი AI</span>
            </div>
          </div>
        </div>
      </section>

      <section className="infoGrid" id="goal">
        <article className="infoCard">
          <div className="icon">🎯</div>
          <h3>თამაშის მიზანი</h3>
          <p>
            პირველმა დაცალე შენი კენჭები, შექმენი გამარჯვებული ალიანსი ან
            მოიგე ლიდერის სტატუსით.
          </p>
        </article>

        <article className="infoCard" id="rules">
          <div className="icon">🧩</div>
          <h3>როგორ მუშაობს</h3>
          <p>
            აირჩიე კენჭი, მიუმართე კონკრეტულ მოთამაშეს, მიიღე პასუხი და
            დააკვირდი შედეგს.
          </p>
        </article>

        <article className="infoCard">
          <div className="icon">👥</div>
          <h3>თამაშის რეჟიმები</h3>
          <p>
            ითამაშე მარტო 5 AI მოთამაშესთან ან შექმენი ოთახი მეგობრებთან
            ერთად.
          </p>
        </article>
      </section>

      <section className="learnSection" id="learn">
        <p className="label">რას ასწავლის თამაში</p>
        <h2>სვლა, არჩევანი და შედეგი</h2>

        <div className="learnGrid">
          <span>სტრატეგიული აზროვნება</span>
          <span>მოლაპარაკება</span>
          <span>ალიანსების შექმნა</span>
          <span>ნეიტრალიტეტის ფასი</span>
          <span>რესურსებით ვაჭრობა</span>
          <span>ლიდერობა</span>
        </div>
      </section>

      <section className="modeSection">
        <div className="modeCard">
          <h3>მარტო</h3>
          <p>
            შენ თამაშობ 5 AI მოთამაშის წინააღმდეგ. კარგი რეჟიმია წესების
            შესასწავლად და სწრაფი პრაქტიკისთვის.
          </p>
          <a href="/setup?mode=solo">დაწყება</a>
        </div>

        <div className="modeCard accent">
          <h3>მეგობრებთან ერთად</h3>
          <p>
            შექმენი თამაშის ოთახი, აირჩიე რამდენი რეალური მოთამაშე შემოვა და
            გაუზიარე ბმული სხვებს.
          </p>
          <a href="/setup?mode=group">ოთახის შექმნა</a>
        </div>
      </section>
    </main>
  );
}
