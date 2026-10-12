import figma from "@figma/code-connect";
import { Card } from "./Card";

figma.connect(Card, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=74-46", {
  props: { variant: figma.enum("Variant", { Flat: "flat", Elevated: "elevated" }) },
  example: ({ variant }) => <Card variant={variant}>Content</Card>,
});
