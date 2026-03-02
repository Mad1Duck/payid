import PayIDPlayground from '@site/src/components/Playground';
import { ReactNode } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

export default function Playground(): ReactNode {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="Description will go into a meta tag in <head />">
      {/* <HomepageHeader /> */}
      {/* <Header /> */}

      <main>
        <PayIDPlayground />;{' '}
      </main>
    </Layout>
  );
}
