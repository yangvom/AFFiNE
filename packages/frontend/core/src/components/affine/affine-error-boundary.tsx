import { Button } from '@affine/component/ui/button';
import type {
  QueryParamError,
  Unreachable,
  WorkspaceNotFoundError,
} from '@affine/env/constant';
import { PageNotFoundError } from '@affine/env/constant';
import { rootWorkspacesMetadataAtom } from '@affine/workspace/atom';
import {
  currentPageIdAtom,
  currentWorkspaceIdAtom,
  getCurrentStore,
} from '@toeverything/infra/atom';
import { useAtomValue } from 'jotai/react';
import { Provider } from 'jotai/react';
import type { ErrorInfo, ReactElement, ReactNode } from 'react';
import type React from 'react';
import { Component, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';

import {
  RecoverableError,
  SessionFetchErrorRightAfterLoginOrSignUp,
} from '../../unexpected-application-state/errors';
import {
  errorDescription,
  errorDetailStyle,
  errorDivider,
  errorImage,
  errorLayout,
  errorRetryButton,
  errorTitle,
} from './affine-error-boundary.css';
import errorBackground from './error-status.assets.svg';

export type AffineErrorBoundaryProps = React.PropsWithChildren;

type AffineError =
  | QueryParamError
  | Unreachable
  | WorkspaceNotFoundError
  | PageNotFoundError
  | Error
  | SessionFetchErrorRightAfterLoginOrSignUp;

interface AffineErrorBoundaryState {
  error: AffineError | null;
  canRetryRecoveredError: boolean;
}

export const DumpInfo = () => {
  const location = useLocation();
  const metadata = useAtomValue(rootWorkspacesMetadataAtom);
  const currentWorkspaceId = useAtomValue(currentWorkspaceIdAtom);
  const currentPageId = useAtomValue(currentPageIdAtom);
  const path = location.pathname;
  const query = useParams();
  useEffect(() => {
    console.info('DumpInfo', {
      path,
      query,
      currentWorkspaceId,
      currentPageId,
      metadata,
    });
  }, [path, query, currentWorkspaceId, currentPageId, metadata]);
  return null;
};

export class AffineErrorBoundary extends Component<
  AffineErrorBoundaryProps,
  AffineErrorBoundaryState
> {
  override state: AffineErrorBoundaryState = {
    error: null,
    canRetryRecoveredError: true,
  };

  private readonly handleRecoverableRetry = () => {
    if (this.state.error instanceof RecoverableError) {
      if (this.state.error.canRetry()) {
        this.state.error.retry();
        this.setState({
          error: this.state.error,
          canRetryRecoveredError: this.state.error.canRetry(),
        });
      } else {
        document.location.reload();
      }
    }
  };

  static getDerivedStateFromError(
    error: AffineError
  ): AffineErrorBoundaryState {
    return {
      error,
      canRetryRecoveredError:
        error instanceof RecoverableError ? error.canRetry() : true,
    };
  }

  override componentDidCatch(error: AffineError, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  override render(): ReactNode {
    if (this.state.error) {
      let errorDetail: ReactElement | null = null;
      const error = this.state.error;
      if (error instanceof PageNotFoundError) {
        errorDetail = (
          <>
            <h1>Sorry.. there was an error</h1>
            <>
              <span> Page error </span>
              <span>
                Cannot find page {error.pageId} in workspace{' '}
                {error.workspace.id}
              </span>
            </>
          </>
        );
      } else if (error instanceof SessionFetchErrorRightAfterLoginOrSignUp) {
        const retryButtonDesc = this.state.canRetryRecoveredError
          ? 'Refetch'
          : 'Reload';
        errorDetail = (
          <>
            <h1 className={errorTitle}>Sorry.. there was an error</h1>
            <span className={errorDescription}> Fetching session failed </span>
            <span className={errorDescription}>
              If you are still experiencing this issue, please{' '}
              <a
                style={{ color: 'var(--affine-primary-color)' }}
                href="https://community.affine.pro"
                target="__blank"
              >
                contact us through the community.
              </a>
            </span>
            <Button
              className={errorRetryButton}
              onClick={this.handleRecoverableRetry}
              type="primary"
            >
              {retryButtonDesc}
            </Button>
          </>
        );
      } else {
        errorDetail = (
          <>
            <h1>Sorry.. there was an error</h1>
            {error.message ?? error.toString()}
          </>
        );
      }
      return (
        <div className={errorLayout}>
          <div className={errorDetailStyle}>{errorDetail}</div>
          <span className={errorDivider} />
          <div
            className={errorImage}
            style={{ backgroundImage: `url(${errorBackground})` }}
          />
          <Provider key="JotaiProvider" store={getCurrentStore()}>
            <DumpInfo />
          </Provider>
        </div>
      );
    }

    return this.props.children;
  }
}
