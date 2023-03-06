type Config = {
  leftTitle: string;
  rightTitle: string;
  items: {
    name: string;
    value: string | number;
    score: number;
    isVisible: boolean;
  }[];
  leftImageUrl: string;
  rightImageUrl: string;
};

type SliderConfig = Config & {
  showTitles?: boolean;
  showTickMarks?: boolean;
  showTickLabels?: boolean;
  isContinuousSlider?: boolean;
};

export type SliderProps = {
  //@todo make sure backend will update config to new keys described below (type RefactoredConfig)
  config: SliderConfig;
  initialValue?: number;
  onChange: (value: number) => void;
  onPress?: () => void;
  onRelease?: () => void;
};

type StackedSliderConfig = (Config & { sliderLabel: string })[];

export type StackedSliderProps = {
  config: StackedSliderConfig;
  initialValues?: (number | null)[];
  onChange: (arrayOfValues: number[]) => void;
  onPress?: () => void;
  onRelease?: () => void;
};

// export type RefactoredConfig = {
//   leftTitle: string; // was minValue
//   rightTitle: string; // was maxValue
//   showTitles: boolean; // was textAnchors
//   leftImageUrl: string; // was minValueImg
//   rightImageUrl: string; // was maxValueImg
//   showTickMarks: boolean; // was tickMark
//   showTickLabels: boolean; // was tickLabel
//   isContinuousSlider: boolean; // was continousSlider
//   items: [
//     {
//       name: string;
//       value: string | number;
//       score: number;
//       isVisible: boolean;
//     },
//   ];
//   // was itemList: [
//   //   {
//   //     name: { en: string | number };
//   //     value: string | number;
//   //     score: number;
//   //     isVis: boolean;
//   //   },
//   // ]
// };