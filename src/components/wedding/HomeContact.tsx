const CONTACTS = [
  { name: "Dickson", phone: "0557280570" },
  { name: "Ruth", phone: "0549804124" },
];

export function HomeContact() {
  return (
    <section id="contact" className="section section--beige home-contact" aria-labelledby="home-contact-title">
      <div className="section__head reveal in">
        <div>
          <div className="eyebrow">
            Need help <span className="dot" />
          </div>
          <h2 id="home-contact-title" className="section__title">
            Questions about<br />
            <em>the service?</em>
          </h2>
        </div>
        <p className="section__lede">
          Reach out to our coordinators for any information regarding the service — they&apos;re happy to help.
        </p>
      </div>

      <div className="home-contact__cards reveal-stagger">
        {CONTACTS.map(({ name, phone }) => (
          <a key={name} href={`tel:${phone}`} className="home-contact__card">
            <span className="home-contact__name">{name}</span>
            <span className="home-contact__phone">{phone}</span>
            <span className="home-hub__cta">
              Call <span className="arrow">→</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
