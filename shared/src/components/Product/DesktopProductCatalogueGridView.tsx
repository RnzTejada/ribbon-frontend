import { motion } from "framer";
import React from "react";
import styled from "styled-components";
import { VaultOptions } from "../../constants/constants";

import colors from "../../designSystem/colors";
import sizes from "../../designSystem/sizes";
import theme from "../../designSystem/theme";
import { AssetsList } from "../../store/types";
import {
  getAssetColor,
  getAssetDisplay,
  getAssetLogo,
} from "../../utils/asset";
import FilterDropdown from "../Common/FilterDropdown";
import MultiselectFilterDropdown from "../Common/MultiselectFilterDropdown";
import SwitchViewButton from "./Shared/SwitchViewButton";
import YieldCard from "./Theta/YieldCard";
import {
  DesktopViewType,
  VaultFilterProps,
  VaultSortBy,
  VaultSortByList,
  VaultStrategyList,
} from "./types";

const FilterContainer = styled.div`
  display: flex;
  background: ${colors.backgroundDarker};
  padding: 8px;
  border-radius: ${theme.border.radius};
  box-shadow: 4px 8px 40px rgba(0, 0, 0, 0.24);

  & > * {
    margin-right: 8px;

    &:last-child {
      margin-right: unset;
    }
  }
`;

const YieldCardsContainer = styled.ul`
  display: flex;
  width: calc(320px * 3);
  flex-wrap: wrap;
  justify-content: flex-start;
  margin-bottom: 40px;
  padding-inline-start: 0;

  @media (max-width: ${sizes.lg}px) {
    width: calc(320px * 2);
  }
`;

const YieldCardContainer = styled(motion.li)`
  height: 492px;
  margin: 40px 15px 0px 15px; ;
`;

interface DesktopProductCatalogueGridViewProps {
  setView: React.Dispatch<React.SetStateAction<DesktopViewType>>;
  onVaultPress: (vault: VaultOptions) => void;
  filteredProducts: VaultOptions[];
}

const DesktopProductCatalogueGridView: React.FC<
  DesktopProductCatalogueGridViewProps & VaultFilterProps
> = ({
  setView,
  onVaultPress,
  sort,
  setSort,
  filterStrategies,
  setFilterStrategies,
  filterAssets,
  setFilterAssets,
  filteredProducts,
}) => (
  <div className="container mt-5 d-flex flex-column align-items-center">
    <FilterContainer>
      <MultiselectFilterDropdown
        values={filterStrategies}
        options={VaultStrategyList.map((strategy) => ({
          value: strategy,
          display: strategy,
          color: colors.green,
        }))}
        title="STRATEGY"
        // @ts-ignore
        onSelect={setFilterStrategies}
      />
      <MultiselectFilterDropdown
        values={filterAssets}
        options={AssetsList.map((asset) => {
          const Logo = getAssetLogo(asset);
          let logo = <Logo />;
          switch (asset) {
            case "WETH":
              logo = <Logo height="70%" />;
          }
          return {
            value: asset,
            display: getAssetDisplay(asset),
            color: getAssetColor(asset),
            textColor: colors.primaryText,
            logo: logo,
          };
        })}
        title="DEPOSIT ASSET"
        // @ts-ignore
        onSelect={setFilterAssets}
      />
      <FilterDropdown
        // @ts-ignore
        options={VaultSortByList}
        value={sort}
        // @ts-ignore
        onSelect={(option: string) => {
          setSort(option as VaultSortBy);
        }}
        buttonConfig={{
          background: `${colors.primaryText}14`,
          paddingHorizontal: 16,
          paddingVertical: 12,
          color: colors.primaryText,
        }}
        dropdownMenuConfig={{
          horizontalOrientation: "left",
          topBuffer: 16,
        }}
      />

      <SwitchViewButton view="grid" setView={setView} />
    </FilterContainer>
    <YieldCardsContainer>
      {filteredProducts.map((vault) => (
        <YieldCardContainer
          key={vault}
          layout
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          transition={{
            type: "keyframes",
            ease: "easeOut",
          }}
        >
          <YieldCard vault={vault} onClick={() => onVaultPress(vault)} />
        </YieldCardContainer>
      ))}
    </YieldCardsContainer>
  </div>
);

export default DesktopProductCatalogueGridView;
