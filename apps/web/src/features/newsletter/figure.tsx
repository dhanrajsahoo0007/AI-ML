import "server-only";
import { Img } from "@/components/mdx/assets";
import { hasDarkSvg, inlineSvg } from "@/lib/assets";
import { svgAtStep } from "@/lib/svg-steps";
import { cn } from "@/lib/utils";
import { figurePng, type ResolvedFigure } from "./figures";
import { StepFigure } from "./step-figure.client";

// One numbered figure of an issue's web page (plan §1.2). SVG diagrams are inlined (crisp at any size, light/dark
// with the theme); a build-up figure shows one step and says which. Email gets the PNG instead (email-issue.ts).

const frame =
  "nl-figure overflow-hidden rounded-2xl border border-hairline bg-paper p-1.5 sm:p-5 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:w-full [&_svg]:max-w-[680px]";

function Svg({ fig }: { fig: ResolvedFigure }) {
  const at = (svg: string) => (fig.step ? svgAtStep(svg, fig.step) : svg);
  const light = at(inlineSvg(fig.asset, "light"));
  const dark = hasDarkSvg(fig.asset) ? at(inlineSvg(fig.asset, "dark")) : null;
  return (
    <div role="img" aria-label={fig.alt} className={frame}>
      {dark ? (
        <>
          <div className="dark:hidden" dangerouslySetInnerHTML={{ __html: light }} />
          <div className="hidden dark:block" dangerouslySetInnerHTML={{ __html: dark }} />
        </>
      ) : (
        <div className="nl-figure-svg" dangerouslySetInnerHTML={{ __html: light }} />
      )}
    </div>
  );
}

/** Every step of a build-up figure, for the stepper. Light SVG only: these figures theme themselves with CSS. */
function Stepper({ fig }: { fig: ResolvedFigure }) {
  const svg = inlineSvg(fig.asset, "light");
  const steps = Array.from({ length: fig.asset.steps ?? 0 }, (_, k) => svgAtStep(svg, k + 1));
  return <StepFigure steps={steps} alt={fig.alt} frameClassName={frame} />;
}

export function IssueFigure({ fig, number }: { fig: ResolvedFigure; number: number }) {
  const steps = fig.asset.steps;
  // Phones show figures small; the PNG (the whole figure, or this step) opens full size for pinch-zoom.
  const png = fig.asset.type === "image" ? undefined : figurePng(fig);
  const body =
    fig.asset.type === "image" ? (
      <Img id={fig.asset.id} alt={fig.alt} caption="" />
    ) : fig.allSteps && steps ? (
      <Stepper fig={fig} />
    ) : (
      <Svg fig={fig} />
    );
  return (
    <figure className="not-prose my-10" data-figure={number}>
      {body}
      <figcaption className={cn("mt-3 text-sm leading-relaxed text-muted-foreground")}>
        <span className="font-semibold text-ink">
          Figure {number}
          {fig.step && steps ? ` · step ${fig.step} of ${steps}` : ""}
          {fig.allSteps && steps ? ` · ${steps} steps` : ""}.
        </span>{" "}
        {fig.caption}
        {png?.url && (
          <>
            {" "}
            <a
              href={png.url}
              target="_blank"
              rel="noreferrer"
              className="whitespace-nowrap text-primary underline sm:hidden"
            >
              View full size
            </a>
          </>
        )}
      </figcaption>
    </figure>
  );
}
