import React, { useCallback, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { useWeb3React } from "@web3-react/core";
import { BigNumber, ethers } from "ethers";
import {
  BaseLink,
  PrimaryText,
  SecondaryText,
  Title,
} from "../../designSystem";
import { formatSignificantDecimals } from "../../utils/math";
import YourPosition from "./YourPosition";
import ActionModal from "../ActionModal/ActionModal";
import { ActionButton, ConnectWalletButton } from "../Common/buttons";
import {
  GAS_LIMITS,
  VaultAddressMap,
  VaultOptions,
} from "../../constants/constants";
import useGasPrice from "../../hooks/useGasPrice";
import useVaultData from "../../hooks/useVaultData";
import useVault from "../../hooks/useVault";
import { ACTIONS, PreviewStepProps } from "../ActionModal/types";
import useConnectWalletModal from "../../hooks/useConnectWalletModal";
import { isETHVault, isVaultFull } from "../../utils/vault";
import colors from "../../designSystem/colors";
import { useLatestAPY } from "../../hooks/useAirtableData";
import { getAssetDisplay } from "../../utils/asset";
import WBTCLogo from "../Product/Splash/Vault/WBTCLogo";
import { getERC20Token } from "../../hooks/useERC20Token";
import { useWeb3Context } from "../../hooks/web3Context";
import usePendingTransactions from "../../hooks/usePendingTransactions";
import useTextAnimation from "../../hooks/useTextAnimation";

const { parseUnits, formatUnits } = ethers.utils;

const Container = styled.div<ActionFormVariantProps>`
  ${(props) =>
    props.variant === "mobile" &&
    `
    height: 100%;
    display:flex;
    align-items: center;
    justify-content:center;
  `}
`;

const FormContainer = styled.div`
  font-family: VCR, sans-serif;
  color: #f3f3f3;
  width: 100%;
  border: 1px solid #2b2b2b;
  box-sizing: border-box;
  border-radius: 8px;
`;

const FormTitleContainer = styled.div`
  justify-content: space-evenly;
  position: relative;

  &:before {
    display: block;
    position: absolute;
    height: 100%;
    width: 100%;
    content: " ";
    background-color: ${colors.background};
    z-index: -1;
  }
`;

const FormTitleDiv = styled.div<{ left: boolean; active: boolean }>`
  width: 100%;
  padding: 24px 0;
  background-color: ${(props) =>
    props.active ? "rgb(28, 26, 25,0.95)" : "rgba(255,255,255,0.04)"};
  cursor: pointer;

  &:after {
    background-color: white;
  }

  ${(props) =>
    props.left
      ? "border-top-left-radius: 8px;"
      : "border-top-right-radius: 8px;"}
`;

const FormTitle = styled(Title)<{ active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 24px;
  text-transform: uppercase;
  color: ${(props) => (props.active ? "#f3f3f3" : "rgba(255, 255, 255, 0.64)")};
`;

const InputGuide = styled.div`
  color: #ffffff;
  opacity: 0.4;
  font-size: 12px;
  line-height: 16px;
  letter-spacing: 1.5px;
`;

const ContentContainer = styled.div`
  background: #1c1a19;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
`;

const FormInputContainer = styled.div`
  width: 100%;
  height: 80px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 4px;
`;

const FormInput = styled.input`
  width: 80%;
  height: 100%;
  font-size: 40px;
  line-height: 64px;
  color: #ffffff;
  border: none;
  background: none;

  &:focus {
    color: #ffffff;
    background: none;
    border: none;
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
    border: rgba(255, 255, 255, 0);
  }
`;

const MaxAccessory = styled.div`
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  right: 0;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 8px;
  height: 32px;
  font-size: 11px;
  line-height: 16px;
  text-align: center;
  letter-spacing: 1.5px;
  cursor: pointer;
`;

type WalletBalanceStates = "active" | "inactive" | "error";

const WalletBalance = styled.div<{ state: WalletBalanceStates }>`
  width: 100%;
  text-align: center;
  font-size: 14px;
  line-height: 20px;
  text-transform: uppercase;
  color: ${(props) => {
    switch (props.state) {
      case "active":
        return "#FFFFFFA3";
      case "inactive":
        return "rgba(255, 255, 255, 0.16)";
      case "error":
        return colors.red;
      default:
        return "rgba(255, 255, 255, 0.16)";
    }
  }};
`;

const ApprovalIconContainer = styled.div`
  display: flex;
  justify-content: center;
  margin: 16px 0;
`;

const ApprovalIcon = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 64px;
  height: 64px;
  padding: 8px;
  border-radius: 100px;
  background-color: ${colors.green}29;
`;

const GreenWBTCLogo = styled(WBTCLogo)`
  && * {
    fill: ${colors.green};
  }
`;

const ApprovalDescription = styled(PrimaryText)`
  display: block;
  text-align: center;
  margin-bottom: 16px;
`;

const ApprovalHelp = styled(BaseLink)`
  display: flex;
  justify-content: center;
  text-decoration: underline ${colors.text};
  margin-bottom: 40px;

  &:hover {
    text-decoration: underline ${colors.text}A3;

    span {
      color: ${colors.text}A3;
    }
  }
`;

type ValidationErrors = "none" | "insufficient_balance";

export interface FormStepProps {
  onSubmit?: (previewStepProps: PreviewStepProps) => void;
  vaultOption: VaultOptions;
}

interface ActionFormVariantProps {
  variant: "desktop" | "mobile";
}

const ActionsForm: React.FC<ActionFormVariantProps & FormStepProps> = ({
  variant,
  vaultOption,
  onSubmit = () => {},
}) => {
  // constants
  const DEPOSIT_TAB = true;
  const WITHDRAWAL_TAB = false;
  const isDesktop = variant === "desktop";

  // refs
  const inputRef = useRef<HTMLInputElement | null>(null);

  // network hooks
  const vault = useVault(vaultOption);
  const {
    status,
    userAssetBalance,
    deposits,
    vaultLimit,
    vaultBalanceInAsset,
    maxWithdrawAmount,
    asset,
    decimals,
  } = useVaultData(vaultOption);
  const gasPrice = useGasPrice();
  const { active, account, library } = useWeb3React();
  const { provider } = useWeb3Context();
  const latestAPY = useLatestAPY(vaultOption);
  const [, setPendingTransactions] = usePendingTransactions();

  // state hooks
  const isLoadingData = status === "loading";
  const [isDeposit, setIsDeposit] = useState(true);
  const [inputAmount, setInputAmount] = useState("");
  const [, setShowConnectModal] = useConnectWalletModal();
  const [showActionModal, setShowActionModal] = useState(false);
  const [error, setError] = useState<ValidationErrors>("none");
  const [tokenApprovalStatus, setTokenApprovalStatus] = useState<
    "not required" | "unapproved" | "approving"
  >(isETHVault(vaultOption) ? "not required" : "unapproved");
  const [waitingApproval, setWaitingApproval] = useState(false);
  const waitingApprovalLoadingText = useTextAnimation(
    ["Approving", "Approving .", "Approving ..", "Approving ..."],
    250,
    waitingApproval
  );

  const tokenContract = useMemo(() => {
    if (isETHVault(vaultOption)) {
      return;
    }

    // @ts-ignore
    return getERC20Token(library, asset.toLowerCase());
  }, [vaultOption, asset, library]);

  // derived states
  const vaultFull = isVaultFull(deposits, vaultLimit, decimals);
  const connected = Boolean(active && account);
  const isInputNonZero = parseFloat(inputAmount) > 0;

  const handleClickMax = async () => {
    if (!isLoadingData && connected && vault && account) {
      if (isDeposit && gasPrice !== "") {
        const gasLimit = isDeposit
          ? GAS_LIMITS.depositETH
          : GAS_LIMITS.withdrawETH;
        const gasFee = BigNumber.from(gasLimit.toString()).mul(
          BigNumber.from(gasPrice)
        );
        const total = BigNumber.from(userAssetBalance);
        const maxAmount = total.sub(gasFee);
        const actualMaxAmount = maxAmount.isNegative()
          ? BigNumber.from("0")
          : maxAmount;

        setInputAmount(formatUnits(actualMaxAmount, decimals));
      }
      // Withdraw flow
      else {
        setInputAmount(formatUnits(maxWithdrawAmount, decimals));
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;

    // Do not allow user to enter smaller than 0
    if (rawInput && parseFloat(rawInput) < 0) {
      setInputAmount("");
      return;
    }

    setInputAmount(rawInput); // Let's flush out the input changes first.

    // Make sure we schedule the error updates after the input updates
    requestAnimationFrame(() => {
      if (rawInput) {
        const amount = parseUnits(rawInput, decimals);

        if (!isLoadingData && connected) {
          if (isDeposit && amount.gt(userAssetBalance)) {
            setError("insufficient_balance");
          } else if (!isDeposit && amount.gt(maxWithdrawAmount)) {
            setError("insufficient_balance");
          } else {
            // if nothing was hit, we reset to no error
            setError("none");
          }
        }
      } else {
        // If we do not have any input, we can safely assume there is no error
        setError("none");
      }
    });
  };
  const vaultBalanceStr = vaultBalanceInAsset.toString();

  const previewStepProps = useMemo(() => {
    const actionParams = isDeposit
      ? { action: ACTIONS.deposit, yield: latestAPY.res }
      : {
          action: ACTIONS.withdraw,
          withdrawalFee: 0.5,
        };

    return {
      actionType: isDeposit ? ACTIONS.deposit : ACTIONS.withdraw,
      amount: inputAmount
        ? parseUnits(inputAmount, decimals)
        : BigNumber.from("0"),
      positionAmount: BigNumber.from(vaultBalanceStr),
      actionParams,
    };
  }, [isDeposit, inputAmount, vaultBalanceStr, latestAPY.res, decimals]);

  const canProceedToPreview = () => {
    return !isDeposit || tokenApprovalStatus === "not required";
  };

  const proceedToPreview = () => {
    isDesktop && isInputNonZero && connected && setShowActionModal(true);
    !isDesktop && isInputNonZero && connected && onSubmit(previewStepProps);
  };

  const handleClickActionButton = () => {
    if (!canProceedToPreview()) {
      setTokenApprovalStatus("approving");
      return;
    }

    proceedToPreview();
  };

  const handleApproveToken = async () => {
    setWaitingApproval(true);
    if (tokenContract) {
      const amount = parseUnits(inputAmount, decimals);

      const tx = await tokenContract.approve(
        VaultAddressMap[vaultOption](),
        amount
      );

      const txhash = tx.hash;

      setPendingTransactions((pendingTransactions) => [
        ...pendingTransactions,
        {
          txhash,
          type: "approval",
          amount: amount.toString(),
          vault: vaultOption,
        },
      ]);

      const receipt = await provider.waitForTransaction(txhash);
      if (receipt.status) {
        proceedToPreview();
        // Reset back to unapproved state after proceed to preview, so user can redo the whole flow
        setTokenApprovalStatus("unapproved");
      }
    }
    setWaitingApproval(false);
  };

  const onCloseActionsModal = useCallback(() => {
    setShowActionModal(false);
  }, []);

  const onInputWheel = () => {
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const onSuccess = useCallback(() => {
    setIsDeposit(true);
    setInputAmount("");
    setError("none");
  }, [setInputAmount, setError]);

  const switchToTab = (switchingToDepositTab: boolean) => {
    // Resets the input amount if switching to a different tab
    return () => {
      if (
        (isDeposit && !switchingToDepositTab) ||
        (!isDeposit && switchingToDepositTab)
      ) {
        setIsDeposit(switchingToDepositTab);
        setInputAmount("");
        setError("none");
      }
    };
  };

  let walletText = "";

  if (vaultFull) {
    walletText = "The Vault is currently full";
  } else if (isDeposit) {
    const position =
      account && !isLoadingData && userAssetBalance
        ? formatSignificantDecimals(formatUnits(userAssetBalance, decimals))
        : "---";
    walletText = `Wallet Balance: ${position} ${getAssetDisplay(asset)}`;
  } else {
    const position =
      account && !isLoadingData && userAssetBalance
        ? formatSignificantDecimals(formatUnits(vaultBalanceInAsset, decimals))
        : "---";
    walletText = `Your Position: ${position} ${getAssetDisplay(asset)}`;
  }

  let disabled = true;
  let actionButtonText = "";
  if (error === "insufficient_balance") {
    actionButtonText = "Insufficient Balance";
    disabled = true;
  } else if (isDeposit && isInputNonZero) {
    if (vaultFull) {
      actionButtonText = `Deposit ${getAssetDisplay(asset)}`;
      disabled = true;
    } else {
      actionButtonText = "Preview Deposit";
      disabled = false;
    }
  } else if (isDeposit) {
    actionButtonText = `Deposit ${getAssetDisplay(asset)}`;
    disabled = true;
  } else if (!isDeposit && isInputNonZero) {
    actionButtonText = "Preview Withdrawal";
    disabled = false;
  } else {
    actionButtonText = `Withdraw ${getAssetDisplay(asset)}`;
    disabled = true;
  }

  let walletBalanceState: WalletBalanceStates = "inactive";
  if (vaultFull) {
    walletBalanceState = "error";
  } else {
    walletBalanceState = connected ? "active" : "inactive";
  }

  let button;

  if (connected) {
    button = (
      <ActionButton
        disabled={disabled}
        onClick={handleClickActionButton}
        className="py-3 mb-4"
      >
        {actionButtonText}
      </ActionButton>
    );
  } else {
    button = (
      <ConnectWalletButton
        onClick={() => setShowConnectModal(true)}
        type="button"
        className="btn py-3 mb-4"
      >
        Connect Wallet
      </ConnectWalletButton>
    );
  }

  const desktopActionModal = useMemo(
    () => (
      <ActionModal
        vaultOption={vaultOption}
        variant={"desktop"}
        show={showActionModal}
        onClose={onCloseActionsModal}
        previewStepProps={previewStepProps}
        onSuccess={onSuccess}
      ></ActionModal>
    ),
    [
      vaultOption,
      showActionModal,
      previewStepProps,
      onSuccess,
      onCloseActionsModal,
    ]
  );

  const renderApprovalAssetLogo = useCallback(() => {
    switch (asset) {
      case "WBTC":
        return <GreenWBTCLogo />;
      default:
        return <></>;
    }
  }, [asset]);

  return (
    <Container variant={variant}>
      {isDesktop && desktopActionModal}

      <FormContainer>
        <FormTitleContainer className="d-flex flex-row align-items-center">
          <FormTitleDiv
            left
            active={isDeposit}
            onClick={switchToTab(DEPOSIT_TAB)}
          >
            <FormTitle active={isDeposit}>Deposit</FormTitle>
          </FormTitleDiv>
          <FormTitleDiv
            left={false}
            active={!isDeposit}
            onClick={switchToTab(WITHDRAWAL_TAB)}
          >
            <FormTitle active={!isDeposit}>Withdraw</FormTitle>
          </FormTitleDiv>
        </FormTitleContainer>

        <ContentContainer className="px-4 py-4">
          {isDeposit && tokenApprovalStatus === "approving" ? (
            <>
              <ApprovalIconContainer>
                <ApprovalIcon>{renderApprovalAssetLogo()}</ApprovalIcon>
              </ApprovalIconContainer>
              <ApprovalDescription>
                Before you deposit, the vault needs your permission to invest
                your wBTC in the vault’s strategy.
              </ApprovalDescription>
              <ApprovalHelp
                to="https://google.com"
                target="__blank"
                rel="noreferrer noopener"
              >
                <SecondaryText>Why do I have to do this?</SecondaryText>
              </ApprovalHelp>
              <ActionButton onClick={handleApproveToken} className="py-3 mb-4">
                {waitingApproval
                  ? waitingApprovalLoadingText
                  : `Approve ${getAssetDisplay(asset)}`}
              </ActionButton>
            </>
          ) : (
            <>
              <InputGuide>AMOUNT ({getAssetDisplay(asset)})</InputGuide>
              <FormInputContainer className="position-relative mt-2 mb-5 px-1">
                <FormInput
                  ref={inputRef}
                  type="number"
                  className="form-control"
                  aria-label="ETH"
                  placeholder="0"
                  value={inputAmount}
                  onChange={handleChange}
                  onWheel={onInputWheel}
                />
                {connected && (
                  <MaxAccessory onClick={handleClickMax}>MAX</MaxAccessory>
                )}
              </FormInputContainer>
              {button}
            </>
          )}

          <WalletBalance state={walletBalanceState}>{walletText}</WalletBalance>
        </ContentContainer>
      </FormContainer>

      {connected && isDesktop && (
        <YourPosition vaultOption={vaultOption} className="mt-4 px-4" />
      )}
    </Container>
  );
};

export default ActionsForm;
