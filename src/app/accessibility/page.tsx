import { LegalPageLayout, Title, HeadingOne, HeadingTwo, Bold, BulletList, BulletItem, Paragraph } from '../_components/LegalHelper';

const AccessibilityPage = () => {
    return (
        <LegalPageLayout>
            <Title>Accessibility Statement</Title>
            <Paragraph>
                <Bold>Mane Account Website Application</Bold>
            </Paragraph>
            <Paragraph>
                <Bold>Last Updated:</Bold> January 1st, 2026
            </Paragraph>
            <Paragraph>
                Counter Canter Collective LLC, doing business as <Bold>Mane Account</Bold> (&quot;<Bold>Company</Bold>&quot;, &quot;<Bold>we</Bold>&quot;, &quot;<Bold>us</Bold>&quot;,
                or &quot;<Bold>our</Bold>&quot;), is committed to making the Mane Account mobile application, website, and related services (collectively, the &quot;
                <Bold>Services</Bold>&quot;) accessible and usable for as many people as reasonably possible, including individuals with disabilities.
            </Paragraph>

            <HeadingOne>Our Commitment to Accessibility</HeadingOne>
            <Paragraph>
                We believe accessibility is an ongoing effort and an important part of providing an inclusive digital experience. We strive to design and maintain our Services in a way
                that supports usability, clarity, and accessibility for all users.
            </Paragraph>
            <Paragraph>
                Where feasible, we aim to follow generally recognized accessibility standards, including the <Bold>Web Content Accessibility Guidelines (WCAG)</Bold> published by the
                World Wide Web Consortium (W3C), and to continuously improve accessibility over time.
            </Paragraph>
        </LegalPageLayout>
    );
};

export default AccessibilityPage;
