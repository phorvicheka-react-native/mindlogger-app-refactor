type RadioOptionName = {
  en: string;
};

type RadioOption = {
  value: string | number;
  name: RadioOptionName;
  color?: string;
  isVisible: boolean;
  description: string;
  image?: string;
};

export default RadioOption;