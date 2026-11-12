import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faArrowRightFromBracket, faBagShopping, faBolt, faBox, faCircleCheck, faCircleInfo, faClock, faCrown,
  faFileLines, faGift, faHourglassHalf, faHouse, faLocationDot, faLock, faMagnifyingGlass, faMicrophone,
  faMotorcycle, faPen, faPhone, faRightLeft, faStar, faStore, faTrashCan, faWandMagicSparkles, faWallet,
  faUtensils, faNoteSticky, faHeadset, faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { COLORS } from '../theme/colors';

// Named icons used across the app, so no screen relies on Unicode symbols that render differently per device.
export const ICONS = {
  ai: faWandMagicSparkles, bag: faBagShopping, bolt: faBolt, box: faBox, check: faCircleCheck, clock: faClock,
  crown: faCrown, document: faFileLines, edit: faPen, gift: faGift, help: faHeadset, home: faHouse,
  hourglass: faHourglassHalf, info: faCircleInfo, location: faLocationDot, lock: faLock, logout: faArrowRightFromBracket,
  microphone: faMicrophone, note: faNoteSticky, phone: faPhone, rider: faMotorcycle, search: faMagnifyingGlass,
  star: faStar, store: faStore, swap: faRightLeft, trash: faTrashCan, utensils: faUtensils, wallet: faWallet,
  warning: faTriangleExclamation,
};

export default function Icon({ name, size = 16, color = COLORS.primary, style }) {
  const icon = ICONS[name];
  if (!icon) return null;
  return <FontAwesomeIcon icon={icon} size={size} color={color} style={style} />;
}
