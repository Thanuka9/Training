import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function LandingPage() {
  return (
    <main>
      <section className="border-b border-slate-200 bg-gradient-to-b from-white to-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-700">Internal department system</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight text-navy lg:text-5xl">
              Record, review and report training with a single register.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
              Officers select an Admin-created training programme. Local / Foreign, Type of Training,
              Institution and Venue load automatically. Administrators review submissions and export the
              same columns previously maintained in Excel.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login">
                <Button size="lg">Login</Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="secondary">
                  Register with Bank ID
                </Button>
              </Link>
            </div>
          </div>
          <Card className="bg-navy text-white">
            <CardContent className="space-y-4 py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">How it works</p>
              {[
                ["1", "Admin creates the Training Program (yellow workbook fields)."],
                ["2", "The officer records participation details only."],
                ["3", "Admin approves, returns or rejects the submission."],
                ["4", "Dashboards and the training register update automatically."],
              ].map(([step, text]) => (
                <div key={step} className="flex gap-3 text-sm leading-relaxed text-white/90">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-bold text-navy-800">
                    {step}
                  </span>
                  {text}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 md:grid-cols-3">
        {[
          ["Officers", "Select an approved programme and enter Physical/Online, role, dates and completion status."],
          ["Administrators", "Maintain programmes, activate users, and review every submitted record."],
          ["Reporting", "Officer summaries and Excel/CSV exports replace workbook formulas and helper sheets."],
        ].map(([title, body]) => (
          <Card key={title}>
            <CardContent className="py-6">
              <h2 className="font-serif text-xl font-semibold text-navy">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
