// The NDA document shown on /nda.html.
//
// EDIT THIS FILE to swap in Mandy's approved legal text — nothing else needs
// to change. `NDA_VERSION` should be bumped any time the wording changes
// (it's stored with every signature so we know which text someone agreed to).
// Until legal text is supplied this is a structural PLACEHOLDER only.

window.NDA_VERSION = 'draft-1';
window.NDA_IS_DRAFT = true; // set to false once approved legal text is in place

window.NDA_TITLE = 'Mutual Non-Disclosure Agreement';

window.NDA_BODY_HTML = `
<p><strong>Parties.</strong> This Agreement is between <strong>Cowch</strong>
("the Company", operating as cowch.app) and the individual identified by the
signature below ("the Recipient"), entered into as of the date of signing.</p>

<p><strong>1. Purpose.</strong> The Company wishes to disclose certain
confidential information to the Recipient in connection with discussions
about Cowch's product, clinical approach, and/or a potential working
relationship ("the Purpose"). This Agreement sets out the terms on which
that information is shared.</p>

<p><strong>2. Definition of Confidential Information.</strong> "Confidential
Information" means any information disclosed by the Company to the
Recipient, whether written, oral, or in any other form, that is designated
as confidential or that a reasonable person would understand to be
confidential given its nature and the circumstances of disclosure —
including but not limited to product plans, clinical content and
methodology, user research, business and financial information, and any
material relating to identifiable service users.</p>

<p><strong>3. Obligations of the Recipient.</strong> The Recipient agrees
to: (a) keep all Confidential Information strictly confidential; (b) use it
solely for the Purpose; (c) not disclose it to any third party without the
Company's prior written consent; (d) protect it with at least the same
degree of care used to protect their own confidential information, and no
less than reasonable care.</p>

<p><strong>4. Exclusions.</strong> Confidential Information does not include
information that: is or becomes publicly available through no fault of the
Recipient; was already lawfully known to the Recipient before disclosure; is
independently developed without reference to the Confidential Information;
or is required to be disclosed by law or a competent authority, provided
the Recipient gives prompt notice where legally permitted.</p>

<p><strong>5. Term.</strong> This Agreement applies to Confidential
Information disclosed during the twelve (12) months following signature,
and the confidentiality obligations survive for three (3) years from the
date of disclosure of the relevant information.</p>

<p><strong>6. No licence.</strong> Nothing in this Agreement grants the
Recipient any licence or rights in the Company's intellectual property
beyond what is necessary for the Purpose.</p>

<p><strong>7. Governing law.</strong> This Agreement is governed by, and
construed in accordance with, the laws of England and Wales, and the
parties submit to the exclusive jurisdiction of the courts of England and
Wales.</p>

<p><strong>8. Signature.</strong> By typing their name, checking the
agreement box, and drawing a signature below, the Recipient confirms they
have read, understood, and agree to be bound by this Agreement.</p>
`;
