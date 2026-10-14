import figma from "@figma/code-connect";
import { Stepper } from "./Stepper";

// DCF-0002 candidate Stepper Step (work file), composed into a Stepper in DCF-0003.
figma.connect(Stepper, "https://www.figma.com/design/0CwREH91xlsQOFpAUp852B/FDI---Test?node-id=43-6900", {
  example: () => <Stepper steps={["Participant type", "Enrollment criteria", "Participant blocking"]} current={0} />,
});
